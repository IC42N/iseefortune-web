"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from "next/navigation";
import styles from "./ProfileModal.module.scss";
import { formatLamportsToSol} from "@/utils/solana_helper";
import { myProfileViewAtom, viewedProfileViewAtom } from '@/state/player-profile-atoms';
import { useAtomValue } from "jotai";
import { formatBigint } from "@/utils/number_helper";
import { BottomStatCard } from '@/components/Profile/parts/BottomStat';
import { TopStatCard } from '@/components/Profile/parts/TopStat';
import { bigintUnixSecondsToLocalString, formatAbsFromUnixSeconds, formatRelativeTimeFromBigInt } from '@/utils/time';
import { useViewedProfileByHandle } from '@/hooks/useViewedProfileByHandle';
import { useResolvedGamesForPredictions } from '@/solana/hooks/useResolvedGamesForPredictions';
import { Accordion } from "@base-ui/react/accordion";
import { calcRoiPercent, PredictionResultUI } from '@/utils/prediction-results';
import { ResolvedGameKey } from '@/state/resolved-game-atoms';
import { liveFeedDecodedAtom } from '@/state/live-feed-atoms';
import { AnimatePresence, motion } from "framer-motion";
import { generateHandleFromWalletPubKey, xpToLevel } from '@/utils/profile';
import { epochRangeText } from '@/components/Profile/helpers/helpers';
import { PredictionDetails } from '@/components/Profile/type/predictionDetails';
import { ProfileFetchResponse } from '@/components/Profile/type/ProfileFetchResponse';
import CloudsAndHands from '@/components/ui/CloudsAndHands/CloudsAndHands';
import Stars from '@/components/ui/Stars/Stars';
import { SendTxResult } from '@/solana/tx/send-transaction';
import { submitClaimTx } from '@/solana/tx/claim/submit-claim';
import { useAnchorProvider, useProgram } from '@/solana/anchor-client';
import { ClaimData, ClaimState } from '@/solana/tx/claim/build-claim-ix';
import { usePhaseToast } from '@/components/ui/Toast/use-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { ResolvedGameSummary } from '@/state/resolved-game-types';
import { useViewedProfilePredictions } from '@/solana/hooks/useViewedProfilePredictions';
import { useMyProfilePredictions } from '@/hooks/useProfilePredictions';
import { PredictionReady } from '@/state/prediction-atoms';
import { SelectedNumbers } from '@/components/ui/SelectedNumbers/SelectedNumbers';
//import { NumberPill } from '@/components/NumberPill/NumberPill';



export default function ProfileModal({ handle = "" }: { handle?: string }) {
  const router = useRouter();
  const [openPredictionPks, setOpenPredictionPks] = useState<string[]>([]);
  const { publicKey, connected } = useWallet();
  const walletBase58 = publicKey?.toBase58() ?? null;


  const liveFeed = useAtomValue(liveFeedDecodedAtom);
  const [copiedPk, setCopiedPk] = useState<string | null>(null);
  const [detailsByPredictionPk, setDetailsByPredictionPk] = useState<Map<string, PredictionDetails>>(() => new Map());
  const [claimByPredictionPk, setClaimByPredictionPk] = useState<Map<string, ClaimState>>(() => new Map());

  const provider = useAnchorProvider();
  const program = useProgram();
  const { toastReplace } = usePhaseToast();

  const isSelf = handle.length === 0;
  // const displayHandle = useMemo(() => {
  //   if (!isSelf) return handle;
  //   if (!walletBase58) return "";
  //   return generateHandleFromWalletPubKey(walletBase58);
  // }, [handle, isSelf, walletBase58]);

  //console.log('ProfileModal: handle', handle, 'isSelf', isSelf);

  // Always read both atoms
  const myProfileView = useAtomValue(myProfileViewAtom);
  const otherProfileView = useAtomValue(viewedProfileViewAtom);

  // always run both bet hooks (they should no-op safely when disabled)
  const myPredictionsState = useMyProfilePredictions();
  const viewedPredictionsState = useViewedProfilePredictions(); // driven by viewedPlayerAtom inside

  // Always run the viewed resolver (no-op when self)
  // Gets stats from DynamoDB for the viewing player if not self
  const viewedResolver = useViewedProfileByHandle(handle, { enabled: !isSelf });

  // Choose which data to render
  const profile = isSelf ? myProfileView.profile : otherProfileView.profile;
  const stats = isSelf ? myProfileView.stats : otherProfileView.stats;

  const predictions = isSelf ? myPredictionsState.predictions : viewedPredictionsState.predictions;
  const loading =
    isSelf ? myPredictionsState.loading : (viewedResolver.loading || viewedPredictionsState.predictionsLoading);
  const error =
    isSelf ? myPredictionsState.error : (viewedResolver.error || viewedPredictionsState.errorLoadingPredictions);

  // Is the viewing profile missing?
  const isViewedMissing = !isSelf && !loading && !error && profile == null;

  const predictionsForResolvedFetch = useMemo(() => {
    if (!liveFeed) return predictions;
    const current = liveFeed.first_epoch_in_chain;
    return predictions.filter((b) => b.gameEpoch !== current);
  }, [predictions, liveFeed]);

  const { resolvedGames, loading: resolvedLoading, notFoundKeys } = useResolvedGamesForPredictions(predictionsForResolvedFetch);

  const resultByPredictionPk = useMemo(() => {
    const m = new Map<string, PredictionResultUI>();
    const current = liveFeed?.first_epoch_in_chain ?? null;

    for (const p of predictions) {

      const predictionPk = p.pubkey.toBase58();

      if (current !== null && p.gameEpoch === current) {
        m.set(predictionPk, "IN_PROGRESS");
        continue;
      }

      const key = `${p.gameEpoch.toString()}:${p.tier}` as ResolvedGameKey;
      const game = resolvedGames.get(key);
      if (game) {
        const numbers = p.selections;
        const isWin = numbers.includes(game.winningNumber);
        m.set(predictionPk, isWin ? "WON" : "MISS");
        continue;
      }

      // ✅ only NOT_FOUND if we *know* it’s missing
      if (notFoundKeys?.has(key)) {
        m.set(predictionPk, "NOT_FOUND");
        continue;
      }

      // otherwise it’s simply not loaded yet
      m.set(predictionPk, resolvedLoading ? "LOADING" : "LOADING");
    }

    return m;
  }, [liveFeed?.first_epoch_in_chain, notFoundKeys, predictions, resolvedGames, resolvedLoading]);


  const epochInfoByPredictionPk = useMemo(() => {
    const m = new Map<string, { text: string; span: number | null }>();
    const current = liveFeed?.first_epoch_in_chain ?? null;

    for (const p of predictions) {
      const betPk = p.pubkey.toBase58();

      // current game: no resolvedEpoch yet
      if (current !== null && p.gameEpoch === current) {
        m.set(betPk, { text: `#${Number(p.gameEpoch)}`, span: null });
        continue;
      }

      const key = `${p.gameEpoch.toString()}:${p.tier}` as ResolvedGameKey;
      const rg = resolvedGames.get(key);

      // IMPORTANT: resolvedEpoch comes from resolved game, NOT from bet
      const resolvedEpoch =
        rg?.resolvedEpoch != null ? Number(rg.resolvedEpoch) : null;

      const { text, span } = epochRangeText(p.gameEpoch, resolvedEpoch);
      m.set(betPk, { text, span });
    }
    return m;
  }, [liveFeed?.first_epoch_in_chain, predictions, resolvedGames]);


  function close() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  //Groups all predictions by tier, then returns them sorted by tier number.
  const grouped = useMemo(() => {
    const map = new Map<number, typeof predictions>();
    for (const p of predictions) {
      const arr = map.get(p.tier) ?? [];
      arr.push(p);
      map.set(p.tier, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [predictions]);


  const setDetails = useCallback((betPk: string, next: PredictionDetails) => {
    setDetailsByPredictionPk((prev) => {
      const m = new Map(prev);
      m.set(betPk, next);
      return m;
    });
  }, []);



  // FETCH PROFILE STATS FROM S3
  // Extracts from both winners and tickets JSON files
  //S3: -> resolved-games/${epoch}/${tier}.json
  //S3: -> resolved-games/${epoch}/${tier}.tickets.json
  const fetchProfileExtrasFromS3 = useCallback(
    async (game: ResolvedGameSummary): Promise<ProfileFetchResponse> => {
      if (!walletBase58) return { winner: null, ticketAward: null };
      if (!isSelf) return { winner: null, ticketAward: null };
      const qs = new URLSearchParams({
        epoch: game.resolvedEpoch.toString(), // <--
        tier: String(game.tier),
        wallet: walletBase58,
      });

      const res = await fetch(`/api/profile-fetch-results?${qs.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`profile-fetch-results http ${res.status}`);
      const data = (await res.json());
      return {
        winner: data.winner ?? null,
        ticketAward: data.ticketAward ?? null,
      };
    },
    [isSelf, walletBase58]
  );


  // Fetch
  const fetchBetDetails = useCallback(
    async (p: PredictionReady) => {
      if (!liveFeed) return;
      if (!isSelf) return;

      const predictionPk = p.pubkey.toBase58();

      // Current game => don't fetch S3
      if (p.gameEpoch === liveFeed.first_epoch_in_chain) {
        setDetails(predictionPk, {
          status: "error",
          error: "Game is in progress. Please wait until it ends.",
        });
        return;
      }

      const cached = detailsByPredictionPk.get(predictionPk);
      if (cached?.status === "loading" || cached?.status === "ready") return;

      setDetails(predictionPk, { status: "loading" });

      try {
        // Local resolved summary
        const key = `${p.gameEpoch.toString()}:${p.tier}` as const;
        const rg = resolvedGames.get(key);

        if (!rg) {
          setDetails(predictionPk, {
            status: "error",
            error:
              "Game not found. If the game just ended, it is being processed. Please try again in a few minutes.",
          });
          return;
        }

        // Fetch wallet-specific extras (winner proof/payout + tickets)
        const extras = await fetchProfileExtrasFromS3(rg);

        const payoutLamports = extras.winner
          ? BigInt(extras.winner.payout_lamports)
          : 0n;

        // -----------------------------
        // NEW: wager breakdown
        // -----------------------------
        const selectionCount = p.selectionCount ?? p.selections?.length ?? 0;
        const wagerTotalLamports = p.wagerTotalLamports ?? 0n;

        const wagerPerSelectionLamports =
          selectionCount > 0 ? wagerTotalLamports / BigInt(selectionCount) : 0n;

        const roiPercent = calcRoiPercent(wagerTotalLamports, payoutLamports);

        setDetails(predictionPk, {
          status: "ready",

          epoch: BigInt(rg.resolvedEpoch),
          tier: p.tier,

          // summary you already have
          winningNumber: rg.winningNumber,
          arweaveUrl: rg.arweaveUrl ?? undefined,
          hasClaimed: p.hasClaimed,
          claimedAt: p.claimedAtTs,

          // winner extras
          isWinner: !!extras.winner,
          payoutLamports,
          proof: extras.winner?.proof ?? [],
          winnerIndex: extras.winner?.index,
          totalPotLamports: rg.netPotLamports ? BigInt(rg.netPotLamports) : 0n,

          // tickets extras
          ticketAward: extras.ticketAward
            ? {
              placedSlot: extras.ticketAward.placed_slot,
              lamports: BigInt(extras.ticketAward.lamports),
              rewarded: extras.ticketAward.rewarded,
            }
            : undefined,

          // -----------------------------
          // NEW: details for UI display
          // -----------------------------
          wagerTotalLamports,
          selectionCount,
          wagerPerSelectionLamports,
          roiPercent,
        });
      } catch (e: unknown) {
        const errorMsg = (e as Error).message;
        setDetails(predictionPk, {
          status: "error",
          error: `Failed to load details: ${errorMsg}`,
        });
      }
    },
    [
      detailsByPredictionPk,
      fetchProfileExtrasFromS3,
      isSelf,
      liveFeed,
      resolvedGames,
      setDetails,
    ]
  );


  // CLAIMING
  const setClaimState = useCallback((predictionPk: string, next: ClaimState) => {
    setClaimByPredictionPk((prev) => {
      const m = new Map(prev);
      m.set(predictionPk, next);
      return m;
    });
  }, []);


  const claimWinner = useCallback(
    async (predictionPk: string) => {
      if (!publicKey) throw new Error("Wallet not connected.");
      if (!program) throw new Error("Program not initialized.");
      if (!provider) throw new Error("Provider not initialized.");

      const details = detailsByPredictionPk.get(predictionPk);
      if (!details || details.status !== "ready") throw new Error("Details not loaded.");
      if (!details.isWinner) throw new Error("Not a winner.");
      if (details.hasClaimed) return;

      // Must have these to claim
      if (details.winnerIndex == null) throw new Error("Missing winner index.");
      if (!details.proof ) throw new Error("Missing proof field.");
      if (!details.payoutLamports || details.payoutLamports <= 0n) throw new Error("Missing payout amount.");
      if (!details.epoch) throw new Error("Missing epoch.");
      if (!details.tier) throw new Error("Missing tier.");

      const payoutSol = formatLamportsToSol(details.payoutLamports);

      setClaimState(predictionPk, { status: "loading" });

      const data: ClaimData = {
        predictionPk,
        epoch: details.epoch,
        tier: details.tier,
        wallet: publicKey.toBase58(),
        winnerIndex: details.winnerIndex,
        payoutLamports: details.payoutLamports,
        proof: details.proof, // keep as your API expects (array of strings/b58/base64)
      }


      try {
        const result: SendTxResult = await submitClaimTx({
          program,
          provider,
          data,
          onAfterSignAction: () => setClaimState(predictionPk, { status: "sending" }),
        });

        if (!result.ok) {
          setClaimState(predictionPk, {status: "idle"});

          if (result.reason === "USER_REJECTED") {
            toastReplace({
              title: "Transaction cancelled",
              description: "You cancelled the wallet prompt.",
              type: "info",
            });
            return;
          }

          // FAILED
          toastReplace({
            title: "Transaction failed",
            description: result.message,
            type: "error",
          });
          return;
        }


        // Signature exists from here
        //const { signature } = result;
        toastReplace({
          title: "Claim success!",
          description: `${payoutSol} SOL successfully claimed into your account.`,
          type: "success",
        });

        setClaimState(predictionPk, { status: "success" });

        //Refetch bets state
        myPredictionsState.refetch?.();

        //force a refresh by clearing cached details:
        setDetailsByPredictionPk((prev) => {
          const m = new Map(prev);
          // mark as idle so opening/refresh will reload from S3 next time, OR set to loading/ready after refetching
          m.delete(predictionPk);
          return m;
        });

        setClaimState(predictionPk, { status: "idle" });
      } catch (e) {
        console.error(e);

        const errorMsg = (e as Error).message;
        setClaimState(predictionPk, { status: "error", message: errorMsg ?? "Claim failed." });
      }
    },
    [detailsByPredictionPk, myPredictionsState, program, provider, publicKey, setClaimState, toastReplace]
  );

  const showInitialLoading = publicKey && loading && predictions.length === 0 && !error;
  const canShowTop = !error;

  const safeStats = useMemo(() => {
    return {
      totalCorrect: stats?.totalCorrect ?? 0,
      totalWrong: stats?.totalWrong ?? 0,
      lastResult: stats?.lastResult ?? null,
      bestWinStreak: stats?.bestWinStreak ?? 0,
      totalPayoutLamports: stats?.totalPayoutLamports ?? 0n,
      rank: stats?.rank ?? null,
    };
  }, [stats]);

  const safeProfile = useMemo(() => {
    return {
      xp: profile?.xp ?? 0n,
      tickets: profile?.tickets ?? 0,
      level: profile?.level ?? null,
    };
  }, [profile]);

  const levelProgress = useMemo(() => {
    // Prefer the precomputed level progress if present
    return profile?.level ?? xpToLevel(profile?.xp ?? 0n);
  }, [profile?.level, profile?.xp]);


  const correctOrMiss =
    safeStats.lastResult === "WRONG"
      ? "MISS"
      : safeStats.lastResult === "CORRECT"
        ? "CORRECT"
        : "—";


  return (
    <div className={styles.overlay} onClick={close}>

      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalInner} >

          <div className={styles.heroWallet}>
            <div className={styles.heroWalletInner}>
              <div className={styles.handleRankBx}>
                <div className={styles.handle}>
                  {isSelf
                    ? (connected && walletBase58 ? generateHandleFromWalletPubKey(walletBase58) : "—")
                    : (handle || "—")}
                </div>
                <div className={styles.rank}>{stats && stats.rank ? stats?.rank : 'New Player'}</div>
              </div>
            </div>
          </div>
          <CloudsAndHands />
          <button className={styles.close} onClick={close} type="button" aria-label="Close">×</button>


        <div className={styles.body}>
          <Stars />

          {/* Profile top */}
          {canShowTop && (
            <div className={styles.profileTop}>
              <div className={styles.hero}>

                {/* XP / Level */}
                <div className={styles.xpBox}>
                  <div className={styles.xpBarOuter} aria-label="XP progress">
                    <div className={styles.xpBarInner} style={{ width: `${levelProgress.pct}%` }} />
                  </div>
                </div>

                <div className={styles.heroStats}>
                  <TopStatCard
                    label="CORRECT"
                    value={safeStats.totalCorrect}
                    tone="success"
                  />

                  <TopStatCard
                    label="MISS"
                    value={safeStats.totalWrong}
                    tone="danger"
                  />

                  <TopStatCard
                    label="XP"
                    value={formatBigint(safeProfile.xp)}
                    tone="warning"
                  />

                  <TopStatCard
                    label="TICKETS"
                    value={safeProfile.tickets}
                    tone="info"
                  />
                </div>
              </div>



              {/* Dynamo stats */}
              {stats && (
                <div className={styles.performanceBx}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>Performance</div>
                  </div>
                  <div className={styles.statsGrid}>
                    <BottomStatCard
                      label="Last Prediction"
                      value={correctOrMiss}
                      tone={
                        correctOrMiss === "CORRECT"
                          ? "success"
                          : correctOrMiss === "MISS"
                            ? "danger"
                            : "neutral"
                      }
                    />
                    <BottomStatCard label="Best Win Streak" value={stats.bestWinStreak} />
                    <BottomStatCard
                      label="Total Profit"
                      value={<>{formatLamportsToSol(BigInt(stats.totalPayoutLamports))} <span className={styles.unit}>SOL</span></>}
                    />
                  </div>
                </div>
              )}
            </div>
          )}


          {/* States */}
          {isSelf && !connected && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No wallet connected</div>
              <div className={styles.emptySub}>Connect a wallet to view your profile.</div>
            </div>
          )}

          {isSelf && showInitialLoading && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <div className={styles.loadingText}>Loading profile</div>
            </div>
          )}

          {publicKey && !loading && error && (
            <div className={styles.errorState}>
              <div className={styles.errorTitle}>Couldn’t load profile</div>
              <div className={styles.errorSub}>{error}</div>
            </div>
          )}

          {isSelf && publicKey && !loading && !error && predictions.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No predictions found</div>
              <div className={styles.emptySub}>Place a prediction to see the results here.</div>
            </div>
          )}

          {!isSelf && isViewedMissing && (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No history found</div>

            </div>
          )}

          <Accordion.Root
            className={styles.predictions}
            value={openPredictionPks}
            onValueChange={(v) => {
              // v is an array in your Base UI typings
              const next = Array.isArray(v) ? (v as string[]) : [];
              // OPTIONAL: enforce "single open" behavior:
              setOpenPredictionPks(next.length ? [next[next.length - 1]!] : []);
            }}
          >
            {grouped.map(([tier, tierPredictions]) => (

              <div key={tier} className={styles.groupCard}>
                <div className={styles.list}>

                  {tierPredictions.map((p) => {

                    const predictionPk = p.pubkey.toBase58();
                    const details = detailsByPredictionPk.get(predictionPk);
                    const isOpen = openPredictionPks.includes(predictionPk);
                    const result = resultByPredictionPk.get(predictionPk) ?? "LOADING";
                    const epochInfo = epochInfoByPredictionPk.get(predictionPk);

                    const claimStatus = claimByPredictionPk.get(predictionPk)?.status ?? "idle";
                    const isBusy = claimStatus === "loading" || claimStatus === "sending";
                    const label =
                      claimStatus === "loading"
                        ? "Preparing…"
                        : claimStatus === "sending"
                          ? "Processing…"
                          : claimStatus === "success"
                            ? "Claimed"
                            : claimStatus === "error"
                              ? "Retry"
                              : "Claim";

                    // If details are loaded, trust the S3 proof winner flag.
                    // Otherwise, fall back to your resolvedGames-derived row result.
                    const didWin =
                      details?.status === "ready"
                        ? details.isWinner === true
                        : result === "WON";


                    // Only allow claim if details are ready + winner + not claimed.
                    const canClaim =
                      details?.status === "ready" &&
                      details.isWinner === true &&
                      details.hasClaimed !== true;
                    return (
                      <Accordion.Item key={predictionPk} className={styles.eachPredictionItem} value={predictionPk} data-open={isOpen ? "true" : "false"}>
                        <Accordion.Header className={styles.header}>
                          <Accordion.Trigger className={styles.rowTrigger}
                           onClick={() => {
                             const willOpen = !openPredictionPks.includes(predictionPk);
                             if (willOpen) void fetchBetDetails(p);
                           }}
                          >
                            <motion.div
                              className={`${styles.row} ${isOpen ? styles.rowOpen : ""}`}
                              whileTap={{ scale: 0.985 }}
                              transition={{ type: "spring", stiffness: 700, damping: 32, mass: 0.5 }}
                            >

                            {/* --- your existing row layout becomes the Trigger content --- */}

                              <div className={styles.rowLeft}>
                                {/*<NumberPill value={p.number} />*/}
                                <SelectedNumbers numbers={p.selections} />
                                <div className={styles.rowMain}>
                                  <div className={styles.rowTitle}>
                                    {epochInfo?.text ?? `#${Number(p.gameEpoch)}`} • Tier {tier}
                                  </div>
                                  <div className={styles.rowSub}>
                                    {bigintUnixSecondsToLocalString(p.placedAtTs)}
                                  </div>
                                </div>
                              </div>

                              <div className={styles.rowRight}>
                                <div className={styles.amount}>
                                  {formatLamportsToSol(p.wagerTotalLamports)} <span className={styles.unit}>SOL</span>
                                </div>

                                <div className={styles.result}>

                                  {result === "IN_PROGRESS" && (
                                    <span className={styles.inProgress}>IN PROGRESS</span>
                                  )}

                                  {result === "WON" && (
                                    <span className={styles.won}>WON</span>
                                  )}

                                  {result === "MISS" && (
                                    <span className={styles.lost}>MISS</span>
                                  )}

                                  {result === "LOADING" && (
                                    <span className={styles.loading}>LOADING</span>
                                  )}

                                  {result === "NOT_FOUND" && (
                                    <span className={styles.notFound}>NOT FOUND</span>
                                  )}
                                </div>

                              </div>
                            </motion.div>
                          </Accordion.Trigger>
                        </Accordion.Header>

                        {isSelf && (
                        <div className={styles.panel}>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                key="panel"
                                className={styles.panelMotion}
                                initial={{ height: 0, opacity: 0, scale: 0.97, y: -6, filter: "blur(3px)" }}
                                animate={{ height: "auto", opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ height: 0, opacity: 0, scale: 0.97, y: -6, filter: "blur(3px)" }}
                                transition={{
                                  height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                                  opacity: { duration: 0.18 },
                                  y: { duration: 0.22 },
                                  scale: { type: "spring", stiffness: 420, damping: 34, mass: 0.6 },
                                  filter: { duration: 0.18 },
                                }}
                                style={{ overflow: "hidden" }}
                              >
                                <div className={styles.panelInner}>

                                  {details?.status === "loading" && (
                                    <div className={styles.detailsLoading}>Loading details…</div>
                                  )}

                                  {details?.status === "error" && (
                                    <div className={styles.detailsError}>{details.error}</div>
                                  )}

                                  {(!details || details.status === "idle") && (
                                    <div className={styles.detailsHint}>Reopen to load details.</div>
                                  )}

                                  {details?.status === "ready" && (
                                    <div className={styles.detailsGrid}>


                                      {didWin && (
                                        <div className={styles.winnerBanner} role="status" aria-live="polite">
                                          <div className={styles.winnerIcon} aria-hidden="true">🎉</div>

                                          <div className={styles.winnerContent}>
                                            <div className={styles.winnerTitle}>Congratulations — you won!</div>

                                            <div className={styles.winnerSub}>
                                              Payout:{" "}
                                              <span className={styles.winnerAmount}>
                                                {formatLamportsToSol(details.payoutLamports ?? 0n)} <span className={styles.unit}>SOL</span>
                                              </span>
                                            </div>
                                          </div>


                                          <div className={styles.claimSection}>
                                            <div className={styles.winnerAction}>
                                              {details.hasClaimed ? (
                                                <div className={styles.claimedPill}>
                                                  <span
                                                    title={
                                                      details.claimedAt
                                                        ? formatAbsFromUnixSeconds(BigInt(details.claimedAt))
                                                        : ""
                                                    }
                                                  >
                                                  Claimed{" "}
                                                    {details.claimedAt
                                                      ? formatRelativeTimeFromBigInt(BigInt(details.claimedAt))
                                                      : ""}
                                                </span>
                                                </div>
                                              ) : canClaim ? (
                                                <button
                                                  className={`${styles.claimBtn} ${isBusy ? styles.claimBtnBusy : ""} ${claimStatus === "error" ? styles.claimBtnError : ""}`}
                                                  type="button"
                                                  disabled={isBusy}
                                                  aria-busy={isBusy}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    void claimWinner(predictionPk);
                                                  }}
                                                >
                                                  {isBusy && <span className={styles.btnSpinner} aria-hidden="true" />}
                                                  <span className={styles.btnLabel}>{label}</span>
                                                </button>
                                              ) : (
                                                <div className={styles.notClaimable}>Show up at epoch resolve</div>
                                              )}
                                            </div>

                                          </div>

                                        </div>
                                      )}



                                      <div className={styles.detailBox}>
                                        <div className={styles.detailRow}>
                                          <span className={styles.detailLabel}>Prediction PDA</span>

                                          <span className={styles.detailValueWithCopy}>
                                        <span className={styles.mono}>
                                          {predictionPk.slice(0, 4)}…{predictionPk.slice(-4)}
                                        </span>

                                        <button
                                          type="button"
                                          className={styles.copyBtn}
                                          aria-label="Copy PDA"
                                          title={copiedPk === predictionPk ? "Copied!" : "Copy PDA"}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            void navigator.clipboard.writeText(predictionPk);
                                            setCopiedPk(predictionPk);
                                            window.setTimeout(() => {
                                              setCopiedPk((cur) => (cur === predictionPk ? null : cur));
                                            }, 900);
                                          }}
                                        >
                                          {copiedPk === predictionPk ? (
                                            <span className={styles.checkMark} aria-hidden="true">✓</span>
                                          ) : (
                                            <svg
                                              className={styles.copyIcon}
                                              viewBox="0 0 24 24"
                                              width="14"
                                              height="14"
                                              aria-hidden="true"
                                            >
                                              <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                                              <rect x="4" y="4" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                                            </svg>
                                          )}
                                        </button>
                                      </span>
                                        </div>

                                        <div className={styles.detailRow}>
                                          <span className={styles.detailLabel}>Winning Number</span>
                                          <span className={styles.detailValue}>{details.winningNumber ?? "—"}</span>
                                        </div>


                                        <div className={styles.detailRow}>
                                          <span className={styles.detailLabel}>Total Pot</span>
                                          <span className={styles.detailValue}>
                                          {formatLamportsToSol(details.totalPotLamports?? 0n)} <span className={styles.unit}>SOL</span>
                                        </span>
                                        </div>

                                        {details.ticketAward && (
                                          <div className={styles.detailRow}>
                                            <span className={styles.detailLabel}>Tickets Earned</span>
                                            <span className={styles.detailValue}>
                                            {details.ticketAward.rewarded}
                                          </span>
                                          </div>
                                        )}


                                        <div className={styles.detailRow}>
                                          <span className={styles.detailLabel}>Arweave Proof</span>
                                          <span className={styles.detailValue}>
                                          {details.arweaveUrl ? (
                                            <a href={details.arweaveUrl} target="_blank" rel="noreferrer">
                                              View
                                            </a>
                                          ) : (
                                            "—"
                                          )}
                                        </span>
                                        </div>

                                      </div>

                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        )}

                      </Accordion.Item>
                    );
                  })}

                </div>
              </div>
            ))}
          </Accordion.Root>

        </div>
      </div>
      </div>
    </div>
  );
}