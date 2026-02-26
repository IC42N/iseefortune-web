"use client";

import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import styles from "./PotBar.module.scss";

import { liveFeedDecodedAtom, liveFeedFXAtom } from "@/state/live-feed-atoms";
import {
  decimalsNeededForLamports,
  formatLamportsToSol,
  lamportQuantumForDecimals,
} from "@/utils/solana_helper";
import { useAnimatedBigInt } from "@/hooks/useAnimatedBigInt";
import { FancyCountUp } from '@/components/ui/FancyCountUp/FancyCountUp';



export default function TierPotCard() {
  const lf = useAtomValue(liveFeedDecodedAtom);
  const fx = useAtomValue(liveFeedFXAtom);

  const targetLamports = lf?.total_lamports ?? null;

  const decimals = targetLamports ? decimalsNeededForLamports(targetLamports, 4) : 0;
  const quantum = lamportQuantumForDecimals(decimals);

  const animatedLamports = useAnimatedBigInt(targetLamports, {
    durationMs: 650,
    quantum,
  });

  // ✅ pulse without remounting the whole box
  const [pulseOn, setPulseOn] = useState(false);

  useEffect(() => {
    if (fx.potDeltaLamports <= 0n) return;

    setPulseOn(false);
    // next frame: re-add class so CSS animation restarts
    const raf = requestAnimationFrame(() => setPulseOn(true));

    // remove after animation duration (match your CSS)
    const t = window.setTimeout(() => setPulseOn(false), 650);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [fx.lastUpdateAtMs, fx.potDeltaLamports]);

  if (!lf || animatedLamports === null) {
    return (
      <section className={styles.potBar}>
        <div className={styles.potBox}>
          <div className={styles.label}>Current Pot</div>
          <div className={styles.pot}>
            <FancyCountUp value={0} decimals={0} suffix=" SOL" />
          </div>
        </div>
      </section>
    );
  }

  const solValue = Number(animatedLamports) / 1_000_000_000;

  return (
    <section className={styles.potBar}>
      <div className={`${styles.potBox} ${pulseOn ? styles.pulse : ""}`}>
        <div className={styles.label}>Current Pot</div>
        <div className={styles.pot}>
          <FancyCountUp
            value={solValue}
            decimals={decimals}
            suffix=" SOL"
            duration={0.65}
            // ✅ IMPORTANT: remove rerunKey so it doesn't "restart"
          />
        </div>
        {fx.potDeltaLamports > 0n && (
          <span key={fx.lastUpdateAtMs} className={styles.delta}>
            +{formatLamportsToSol(fx.potDeltaLamports, 4)} SOL
          </span>
        )}
      </div>
    </section>
  );
}