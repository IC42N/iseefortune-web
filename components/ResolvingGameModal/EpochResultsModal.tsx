"use client";

/**
 * EpochResultsModal
 *
 * - Shows end-of-epoch results (or a “resolving…” animation until finalized)
 * - Supports rollover UI
 * - Computes a best-effort payout estimate (client-side)
 * - Skips the resolution modal entirely when there were 0 predictions
 *
 * Key rules:
 * - “Win” is determined by COVERAGE (selectionsMask includes winning number)
 * - Payout estimate uses PER-NUMBER wager (wagerLamportsPerNumber), not total wager
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";

import { epochResultsModalAtom } from "@/state/epoch-clock-atoms";
import { latestResolvedGameDisplayAtom } from "@/state/resolved-game-atoms";
import { requestEpochResetAtom } from "@/state/reset-game-atoms";
import { liveFeedDecodedAtom } from "@/state/live-feed-atoms";
import { myPredictionAtom } from "@/state/prediction-atoms";

import { ProcessingSteps } from "@/components/ui/ProcessResolveSteps/ProcessResolveSteps";
import { DigitSpinner } from "@/components/ui/DigitSpinner/DigitSpinner";
import Clouds from "@/components/ui/Clouds/Clouds";
import Stars from "@/components/ui/Stars/Stars";
import Hands from "./views/Hands";
import Rollover from "@/components/ResolvingGameModal/views/Rollover";

import { usePhaseToast } from "@/components/ui/Toast/use-toast";
import { estimatePayout } from "@/utils/est-payout";
import { getResultCopy } from "@/utils/result-copy";

import styles from "./EpochResultsModal.module.scss";

export function EpochResultsModal() {
  const router = useRouter();

  // ─────────────────────────────────────────────
  // Global state
  // ─────────────────────────────────────────────
  const modal = useAtomValue(epochResultsModalAtom);
  const resolved = useAtomValue(latestResolvedGameDisplayAtom);
  const lf = useAtomValue(liveFeedDecodedAtom);
  const myPrediction = useAtomValue(myPredictionAtom);

  const setModal = useSetAtom(epochResultsModalAtom);
  const requestReset = useSetAtom(requestEpochResetAtom);

  const { publicKey, connected } = useWallet();
  const { toastReplace } = usePhaseToast();

  // ─────────────────────────────────────────────
  // Refs (used for snapshotting / skipping / debug)
  // ─────────────────────────────────────────────
  const openedRef = useRef(false);
  const betsAtOpenRef = useRef<bigint | null>(null);
  const didSkipRef = useRef(false);
  const prevOpenRef = useRef<boolean | null>(null);

  // ─────────────────────────────────────────────
  // Debug / forced modes
  // ─────────────────────────────────────────────
  const FORCE_FINALE = process.env.NEXT_PUBLIC_FORCE_FINALE === "1";
  const FORCE_RESOLVED = process.env.NEXT_PUBLIC_FORCE_FINALE_RESOLVED === "1";

  type DebugOutcome = "rollover" | "win" | "miss" | "spectator";
  const DEBUG_OUTCOME = (process.env.NEXT_PUBLIC_DEBUG_OUTCOME ?? "rollover") as DebugOutcome;

  // winner number used for the fake resolved record
  const DEBUG_WINNING_NUMBER = Number(process.env.NEXT_PUBLIC_DEBUG_WINNING_NUMBER ?? "7");

  // for participant testing: pretend the user covered this number
  const DEBUG_MY_NUMBER = Number(process.env.NEXT_PUBLIC_DEBUG_MY_NUMBER ?? "3");

  // for spectator testing
  const DEBUG_TOTAL_WINNERS = process.env.NEXT_PUBLIC_DEBUG_TOTAL_WINNERS ?? "42";
  const DEBUG_NET_POT = process.env.NEXT_PUBLIC_DEBUG_NET_POT ?? "123.456 SOL";

  // If FORCE_FINALE is on, modal is always open and epoch is hardcoded for styling
  const modalOpen = FORCE_FINALE ? true : modal.open;
  const modalEpoch = FORCE_FINALE ? 1000 : (modal.epoch ?? null);

  // current fee (if you want to display or seed copy)
  const currentFeeBPS = lf?.current_fee_bps ?? null;

  // ─────────────────────────────────────────────
  // Resolved record (real vs fake-for-styling)
  // ─────────────────────────────────────────────
  const fakeResolved = FORCE_RESOLVED
    ? ({
      epoch: 1000,
      game_epoch: "1000",
      winning_number: String(DEBUG_WINNING_NUMBER),
      total_winners: DEBUG_TOTAL_WINNERS,
      net_prize_sol: DEBUG_NET_POT,
      is_rollover: DEBUG_OUTCOME === "rollover",
      is_final: true,
      status_code: 2,
    } as const)
    : null;

  const resolvedEffective = FORCE_RESOLVED ? fakeResolved : resolved;

  const resolvedEpoch = resolvedEffective ? resolvedEffective.epoch : null;

  // “Final” means: the resolved epoch matches the modal epoch AND the record is final/status_code indicates final.
  const isFinalForThisEpoch =
    modalEpoch != null &&
    resolvedEpoch === modalEpoch &&
    (resolvedEffective?.is_final === true || resolvedEffective?.status_code === 2);

  const winningNumber = Number(resolvedEffective?.winning_number ?? 0);
  const isRollover = !!resolvedEffective?.is_rollover;

  // ─────────────────────────────────────────────
  // Participant / outcome detection
  // ─────────────────────────────────────────────
  const debugActive = FORCE_RESOLVED;

  // “didPredict” means the user has a prediction, or debug says win/miss
  const didPredict = debugActive
    ? (DEBUG_OUTCOME === "win" || DEBUG_OUTCOME === "miss")
    : !!myPrediction;

  // “participant” means user is connected and predicted (except debug mode)
  const isParticipant = debugActive
    ? didPredict
    : connected && didPredict;

  /**
   * Effective selections mask:
   * - Debug: pretend we only covered DEBUG_MY_NUMBER
   * - Real: read from myPrediction
   */
  const effectiveSelectionsMask = useMemo(() => {
    if (debugActive && didPredict) return (1 << DEBUG_MY_NUMBER);
    return myPrediction?.selectionsMask ?? 0;
  }, [debugActive, didPredict, DEBUG_MY_NUMBER, myPrediction?.selectionsMask]);

  /**
   * Coverage check:
   * True if selectionsMask includes the winning number bit.
   */
  const iCoveredWinningNumber = useMemo(() => {
    if (winningNumber < 1 || winningNumber > 9) return false;
    return (effectiveSelectionsMask & (1 << winningNumber)) !== 0;
  }, [effectiveSelectionsMask, winningNumber]);

  /**
   * Win check (final, participant, not rollover, covered the winner)
   */
  const playerWon = useMemo(() => {
    if (!isFinalForThisEpoch) return false;
    if (!isParticipant) return false;
    if (isRollover) return false;
    return iCoveredWinningNumber;
  }, [isFinalForThisEpoch, isParticipant, isRollover, iCoveredWinningNumber]);

  // ─────────────────────────────────────────────
  // Effective wager amounts
  // ─────────────────────────────────────────────
  /**
   * IMPORTANT: payout estimate uses PER-NUMBER wager.
   */
  const effectiveBetLamportsPerNumber = useMemo(() => {
    if (debugActive && didPredict) {
      // believable value for styling
      return 1_000_000n; // 0.001 SOL per-number
    }
    return myPrediction?.wagerLamportsPerNumber ?? null;
  }, [debugActive, didPredict, myPrediction?.wagerLamportsPerNumber]);

  /**
   * Total wager (for copy/text only).
   */
  const effectiveWagerTotalLamports = useMemo(() => {
    if (debugActive && didPredict) {
      // debug currently simulates only 1 covered number, so total == per-number
      return 1_000_000n;
    }
    return myPrediction?.wagerTotalLamports ?? null;
  }, [debugActive, didPredict, myPrediction?.wagerTotalLamports]);

  // ─────────────────────────────────────────────
  // Payout estimate (best-effort)
  // ─────────────────────────────────────────────
  const payoutInfo = useMemo(() => {
    // Must have liveFeed, be a participant, and cover the winner
    if (!lf) return null;
    if (!isParticipant) return null;
    if (!iCoveredWinningNumber) return null;

    // If rollover, there is no “winner payout” this epoch
    if (isRollover) return null;

    // Winning number must be valid
    if (winningNumber < 1 || winningNumber > 9) return null;

    const totalPotLamports = lf.total_lamports ?? null;
    const poolAtWinning = lf.lamports_per_number?.[winningNumber] ?? null;
    if (totalPotLamports == null || poolAtWinning == null) return null;

    // PER NUMBER bet amount (do not use total wager)
    const betLamports = effectiveBetLamportsPerNumber;
    if (betLamports == null) return null;

    return estimatePayout({
      betLamports,
      numberPoolLamports: poolAtWinning,
      totalPotLamports,
      includeSelfInPools: false,
      feeBps: 0,
    });
  }, [
    lf,
    isParticipant,
    iCoveredWinningNumber,
    isRollover,
    winningNumber,
    effectiveBetLamportsPerNumber,
  ]);

  /**
   * Display string for winner payout.
   */
  const playerPayoutText = useMemo(() => {
    if (!playerWon) return null;
    const lamports = payoutInfo?.payoutLamports ?? null;
    if (lamports == null) return "—";
    return `${(Number(lamports) / 1_000_000_000).toFixed(4)} SOL`;
  }, [playerWon, payoutInfo]);

  // ─────────────────────────────────────────────
  // Debug logging (modal open transitions)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (prevOpenRef.current === null) {
      prevOpenRef.current = modal.open;
      return;
    }

    if (prevOpenRef.current !== modal.open) {
      console.log("[EpochResultsModal] modal.open changed:", prevOpenRef.current, "→", modal.open, {
        epoch: modal.epoch,
        resolvedEpoch: resolved?.epoch ?? null,
        isFinalForThisEpoch,
        isRollover: resolvedEffective?.is_rollover ?? null,
      });
      prevOpenRef.current = modal.open;
    }
  }, [modal.open, modal.epoch, resolved?.epoch, isFinalForThisEpoch, resolvedEffective?.is_rollover]);

  // ─────────────────────────────────────────────
  // Auto-skip resolution if there were 0 predictions
  // (snapshot total_bets at first open to avoid racey state changes)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!modalOpen) {
      // reset snapshot when modal closes
      openedRef.current = false;
      betsAtOpenRef.current = null;
      didSkipRef.current = false;
      return;
    }

    if (FORCE_FINALE) return;
    if (!lf) return;
    if (didSkipRef.current) return;

    // snapshot total_bets once, at first open
    if (!openedRef.current) {
      openedRef.current = true;
      betsAtOpenRef.current = lf.total_bets ?? null;
      console.log("[EpochResultsModal] snapshot total_bets at open:", String(betsAtOpenRef.current));
    }

    const betsAtOpen = betsAtOpenRef.current;
    if (betsAtOpen == null) return;

    // if there were any bets, do not skip
    if (betsAtOpen !== 0n) return;

    // otherwise skip
    didSkipRef.current = true;

    console.log("[EpochResultsModal] skipping finale because snapshot total_bets was 0");

    setModal({ open: false, epoch: null });

    toastReplace({
      title: "Skipping game resolution",
      description: "No predictions were made this round. Moving on to next epoch game.",
      type: "success",
    });

    requestReset();
    router.refresh();
  }, [modalOpen, FORCE_FINALE, lf, setModal, toastReplace, requestReset, router]);

  // ─────────────────────────────────────────────
  // Close handlers
  // ─────────────────────────────────────────────
  const closeAndRefresh = useCallback(() => {
    if (!isFinalForThisEpoch) return;
    setModal({ open: false, epoch: null });
    requestReset();
    router.refresh();
  }, [isFinalForThisEpoch, setModal, requestReset, router]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  // Escape key closes only when final
  useEffect(() => {
    if (!modalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (!isFinalForThisEpoch) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      closeAndRefresh();
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [modalOpen, isFinalForThisEpoch, closeAndRefresh]);

  // ─────────────────────────────────────────────
  // Render guards + derived UI copy
  // ─────────────────────────────────────────────
  if (!modalOpen) return null;

  const headerTitle = isFinalForThisEpoch
    ? `Game #${resolvedEffective!.game_epoch} Resolved`
    : `Resolving Game #${modalEpoch ?? "…"}`;

  // “result copy” can use TOTAL wager for messaging (but payout uses per-number)
  const copy = getResultCopy({
    outcome: playerWon ? "win" : "miss",
    betLamports: effectiveWagerTotalLamports,
    payoutLamports: payoutInfo?.payoutLamports ?? null,
    isRollover: resolvedEffective?.is_rollover ?? false,
    seed: `epoch:${modalEpoch}|wallet:${publicKey?.toBase58() ?? "anon"}|fee:${currentFeeBPS ?? "na"}`,
  });

  const variantClass =
    isFinalForThisEpoch && !isRollover && isParticipant
      ? (playerWon ? styles["modal--win"] : styles["modal--lose"])
      : "";

  // ─────────────────────────────────────────────
  // JSX (unchanged)
  // ─────────────────────────────────────────────
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (!isFinalForThisEpoch) return;
        closeAndRefresh();
      }}
    >
      <div className={[styles.modal, variantClass].filter(Boolean).join(" ")}>
        <div className={styles.modalInner}>
          <div className={styles.modalBg}>
            <Clouds />
            <Stars />
            <Hands />
          </div>

          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.title}>{headerTitle}</div>
              <div className={styles.resultsLabel}>Winning Number</div>
            </div>

            <div className={styles.resolvingNumberBx}>
              <div className={[styles.circleImgBx, variantClass].filter(Boolean).join(" ")}>
                <Image
                  src="/SVG/circle-outer.svg"
                  alt=""
                  aria-hidden="true"
                  fill
                  priority
                  className={styles.cloudImg}
                />

                <DigitSpinner
                  spinning={!isFinalForThisEpoch}
                  finalNumber={winningNumber}
                  speedMs={60}
                  slowDownMs={700}
                  slowDownSteps={12}
                  revealKey={modalEpoch ?? "x"}
                  className={styles.digit}
                />
              </div>

              {!isFinalForThisEpoch ? (
                <div className={styles.processingWrap}>
                  <div className={styles.processingLead}>Finalizing results…</div>
                  <ProcessingSteps key={`processing-${modalEpoch ?? "x"}`} />
                </div>
              ) : (
                <div className={styles.resultsWrap}>
                  <div className={styles.resultsBody}>
                    {isRollover ? (
                      <Rollover copy={copy} newFeeBps={currentFeeBPS} />
                    ) : isParticipant ? (
                      <>
                        <div className={[styles.resultHeadline, variantClass].filter(Boolean).join(" ")}>
                          {copy.headline}
                        </div>
                        {copy.body && <div className={styles.subtle}>{copy.body}</div>}

                        {playerWon ? (
                          <>
                            <div className={styles.playerPayout}>+{playerPayoutText}</div>
                            <div className={styles.claimMessage}>Claim will be available in your profile soon.</div>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className={styles.resultHeadline}>{copy.headline}</div>
                        {copy.body && <div className={styles.subtle}>{copy.body}</div>}
                        <div>
                          Congratulations to the <b>{resolvedEffective!.total_winners}</b> winning players.
                        </div>
                        <div>
                          Net pot: <b>{resolvedEffective!.net_prize_sol}</b>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={closeAndRefresh}
                    type="button"
                    className={[
                      styles.continueBtn,
                      !isFinalForThisEpoch ? styles.continueBtnDisabled : "",
                    ].join(" ")}
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}