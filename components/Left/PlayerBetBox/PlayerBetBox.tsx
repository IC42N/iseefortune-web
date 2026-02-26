"use client";

import Link from 'next/link';
import Image from "next/image";
import { useMemo, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAtomValue, useSetAtom } from "jotai";
import styles from "./PlayerBetBox.module.scss";
import { configReadyAtom } from "@/state/config-atoms";
import { epochAtom } from "@/state/global-atoms";
import { selectedTierSettingsUiAtom } from "@/state/tier-atoms";
import { BetTypeId, openBetModalAtom } from '@/state/betting-atom';
import { liveFeedDecodedAtom } from "@/state/live-feed-atoms";
import { myProfileAtom } from "@/state/player-profile-atoms";
import { useCurrentSlot } from "@/solana/hooks/use-current-slot";
import NotConnectedView from "./Views/NotConnectedView";
import ConnectedNoBetView from "./Views/ConnectedNoBetView";
import ConnectedHasBetView from "./Views/ConnectedHasBetView";
import { formatSlots } from '@/utils/betting';
import { buildBetSummaryVm } from '@/utils/bet-summary-vm';
import { useSolUsdSnapshot } from '@/solana/hooks/use-sol-usd-snapshot';
import { estimatePayout } from '@/utils/est-payout';
import { numberToCSSVars } from '@/utils/colors';
import { fetchCorderByEpoch } from '@/utils/corners';
import { currentPredictionHydrationStatusAtom, myPredictionAtom } from '@/state/prediction-atoms';
import { lamportsToSolTextTrim } from '@/utils/solana_helper';


export default function PlayerBetBox() {
  const { connected, publicKey } = useWallet();
  const openBetModal = useSetAtom(openBetModalAtom);

  const config = useAtomValue(configReadyAtom);
  const epoch = useAtomValue(epochAtom);
  const tier = useAtomValue(selectedTierSettingsUiAtom);
  const lf = useAtomValue(liveFeedDecodedAtom);

  const myPrediction = useAtomValue(myPredictionAtom);
  const myProfile = useAtomValue(myProfileAtom);
  const predStatus = useAtomValue(currentPredictionHydrationStatusAtom);

  const isCheckingMyPrediction =
    connected &&
    !!publicKey &&
    (predStatus === "idle" || predStatus === "loading");

  const currentSlot = useCurrentSlot({ commitment: "confirmed", pollMs: 1200 });

  const pauseBet = config?.pauseBet === 1;
  const cutoffSlot = epoch?.cutoffSlot ?? null;

  const remainingSlots = useMemo(() => {
    if (cutoffSlot == null || currentSlot == null) return null;
    return Math.max(0, cutoffSlot - currentSlot);
  }, [cutoffSlot, currentSlot]);

  const bettingClosed =
    pauseBet ||
    (cutoffSlot != null && currentSlot != null && currentSlot >= cutoffSlot);

  const changeTickets = myProfile?.tickets ?? 0;
  const canChangeNumber = !!myPrediction && !bettingClosed && changeTickets > 0;

  const myBetAmountText = useMemo(() => {
    if (!myPrediction) return "";
    return lamportsToSolTextTrim(myPrediction.wagerTotalLamports);
  }, [myPrediction]);

  const canPlaceBet = !!publicKey && !!tier && !!epoch && !!lf && !bettingClosed;

  const normalizeBetType = (v: unknown): BetTypeId => {
    // Only allow 0..3, otherwise default to SINGLE
    return (v === 0 || v === 1 || v === 2 || v === 3) ? v : 0;
  };


  const onPlaceBet = useCallback(() => {
    if (!canPlaceBet) return;
    if (!publicKey || !tier || !lf) return;

    // Prevent placing prediction when loading.
    const status = predStatus; // include in deps
    if (status === "idle" || status === "loading") return;
    if (myPrediction) return;

    openBetModal({
      mode: "new",
      fields: {
        betType: 0,
        player: publicKey,
        tierId: tier.tierId,
        gameEpoch: lf.first_epoch_in_chain,
        numbers: [],
        lamportsPerNumber: 0n,
      },
    });
  }, [canPlaceBet, publicKey, tier, lf, predStatus, myPrediction, openBetModal]);

  const onAddLamports = useCallback(() => {
    if (bettingClosed) return;
    if (!publicKey || !tier || !lf || !myPrediction) return;

    const betType = normalizeBetType(myPrediction.predictionType);
    const numbers = Array.isArray(myPrediction.selections) ? myPrediction.selections : [];

    openBetModal({
      mode: "addLamports",
      betPda: myPrediction.pubkey,

      original: {
        player: publicKey,
        tierId: tier.tierId,
        gameEpoch: lf.first_epoch_in_chain,
        betType,
        numbers,
        lamportsPerNumber: myPrediction.wagerLamportsPerNumber,
      },

      fields: {
        player: publicKey,
        tierId: tier.tierId,
        gameEpoch: lf.first_epoch_in_chain,
        betType,
        numbers,
        lamportsPerNumber: myPrediction.wagerLamportsPerNumber,
      },
    });
  }, [bettingClosed, publicKey, tier, lf, myPrediction, openBetModal]);

  const onChangeNumber = useCallback(() => {
    if (!canChangeNumber) return;
    if (!publicKey || !tier || !lf || !myPrediction) return;

    const betType = normalizeBetType(myPrediction.predictionType);
    const numbers = Array.isArray(myPrediction.selections) ? myPrediction.selections : [];

    openBetModal({
      mode: "changeNumber",
      betPda: myPrediction.pubkey,

      original: {
        player: publicKey,
        tierId: tier.tierId,
        gameEpoch: lf.first_epoch_in_chain,
        betType,
        numbers,
        lamportsPerNumber: myPrediction.wagerLamportsPerNumber,
      },

      fields: {
        player: publicKey,
        tierId: tier.tierId,
        gameEpoch: lf.first_epoch_in_chain,
        betType,
        numbers,
        lamportsPerNumber: myPrediction.wagerLamportsPerNumber,
      },
    });
  }, [canChangeNumber, publicKey, tier, lf, myPrediction, openBetModal]);



  const showMyBetSummary = !!myPrediction; // or (!!connected && !!myBet)
  const { usd: solUsd } = useSolUsdSnapshot(showMyBetSummary);

  const usdInfo = useMemo(() => {
    if (!solUsd) return null;
    if (!myPrediction) return null;

    const betSol = Number(myPrediction.wagerTotalLamports) / 1e9;
    const betUsdText = betSol > 0 ? `$${(betSol * solUsd).toFixed(2)}` : "";

    return { solUsd, betUsdText };
  }, [solUsd, myPrediction]);



  const payoutInfo = useMemo(() => {
    if (!myPrediction || !lf) return null;

    const betType = normalizeBetType(myPrediction.predictionType);
    const picks = Array.isArray(myPrediction.selections) ? myPrediction.selections : [];

    // Only estimate payout for SINGLE (your BetModal does this too)
    if (betType !== 0) return null;

    const pick = picks[0];
    if (pick == null) return null;

    const totalPotLamports = lf.total_lamports ?? null;
    const numberPoolLamports = lf.lamports_per_number?.[pick] ?? null;
    if (totalPotLamports == null || numberPoolLamports == null) return null;

    return estimatePayout({
      betLamports: myPrediction.wagerTotalLamports,
      numberPoolLamports: BigInt(numberPoolLamports),
      totalPotLamports: BigInt(totalPotLamports),
      includeSelfInPools: false, // existing bet
      feeBps: 0,
  });
  }, [myPrediction, lf]);

  const betSummaryVm = useMemo(() => {
    if (!myPrediction) return null;

    const betType = normalizeBetType(myPrediction.predictionType);
    const numbers = Array.isArray(myPrediction.selections) ? myPrediction.selections : [];
    if (numbers.length === 0) return null;

    const isSingle = betType === 0 && numbers.length === 1;
    const pick = isSingle ? numbers[0] : null;

    // per-pick breakdown for multi
    const pickCount = Math.max(1, numbers.length);
    const perPickLamports = myPrediction.wagerTotalLamports / BigInt(pickCount);

    return buildBetSummaryVm({
      show: true,

      betType,
      numbers,

      payoutInfo: isSingle ? payoutInfo : null,
      usdInfo,

      playersOnNumber:
        pick != null ? (Number(lf?.bets_per_number?.[pick]) ?? null) : null,

      betLamports: myPrediction.wagerTotalLamports,
      perPickLamports: numbers.length > 1 ? perPickLamports : null,

      minLamports: tier?.minBet ?? null,
      maxLamports: tier?.maxBet ?? null,
      isBettingClosed: bettingClosed,
    });
  }, [myPrediction, payoutInfo, usdInfo, lf?.bets_per_number, tier?.minBet, tier?.maxBet, bettingClosed]);


  const cornerSVG = '/corners/' + fetchCorderByEpoch(epoch?.epoch ?? 0);

  return (
    <section className={styles.box}>
      <div className={styles.body}>
        <div className={styles.cardBox} style={numberToCSSVars(myPrediction ? myPrediction.selections[0] : 0, 0.9)}>
          <div className={styles.boxInner}>
            <div className={styles.topLeftCorner}>
              <Image src={cornerSVG} alt="" width={130} height={100} className={styles.crystalBall} />
            </div>
            <div className={styles.topRightCorner}>
              <Image src={cornerSVG} alt="" width={130} height={100} className={styles.crystalBall} />
            </div>
            <div className={styles.bottomLeftCorner}>
              <Image src={cornerSVG} alt="" width={130} height={100} className={styles.crystalBall} />
            </div>
            <div className={styles.bottomRightCorner}>
              <Image src={cornerSVG} alt="" width={130} height={100} className={styles.crystalBall} />
            </div>

            {!myPrediction ? (
              <div className={styles.ball}>
                <Image src="/SVG/ball-2.svg" alt="" width={120} height={90} className={styles.crystalBall} />
              </div>
            ) : null}

            {!connected ? (
              <NotConnectedView />
            ) : isCheckingMyPrediction ? (
              <ConnectedNoBetView
                bettingClosed={bettingClosed}
                onPlaceBetAction={() => {}}
                canPlaceBet={false}
                // add props like:
                // title="Checking your prediction…"
                // subtitle="One moment — syncing from the chain."
              />
            ) : myPrediction ? (
              <ConnectedHasBetView
                betSummaryVm={betSummaryVm}
                bettingClosed={bettingClosed}
                myPrediction={myPrediction}
                myBetAmountText={myBetAmountText}
                changeTickets={changeTickets}
                canChangeNumber={canChangeNumber}
                onAddLamportsAction={onAddLamports}
                onChangeNumberAction={onChangeNumber}
              />
              ) : (
              <ConnectedNoBetView
              bettingClosed={bettingClosed}
            onPlaceBetAction={onPlaceBet}
            canPlaceBet={canPlaceBet}
          />
          )}

            {!bettingClosed ? (
              <div className={styles.footer}>
                <Link href="/how-to-play?forceOpen=1" className={styles.howToPlay}>How to Play</Link>
                <div className={styles.countdown}>
              <span className={styles.countLabel}>Cut off in</span>
                  <div className={styles.countValue}>
                    {remainingSlots == null
                      ? "PENDING"
                      : bettingClosed
                        ? "CLOSED"
                        : formatSlots(remainingSlots)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>


    </section>
  );
}