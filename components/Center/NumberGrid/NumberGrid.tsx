"use client";

import Image from "next/image";
import { useAtomValue } from "jotai";
import styles from "./NumberGrid.module.scss";

import { liveFeedDecodedAtom, liveFeedFXAtom } from "@/state/live-feed-atoms";
import { configReadyAtom } from "@/state/config-atoms";
import { formatBigInt } from "@/utils/solana_helper";
import { CSSVars, HUE_BY_NUMBER } from "@/utils/colors";

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function NumberGrid() {
  const lf = useAtomValue(liveFeedDecodedAtom);
  const fx = useAtomValue(liveFeedFXAtom);
  const config = useAtomValue(configReadyAtom);

  if (!lf) {
    return (
      <section className={styles.root}>
        <div className={styles.grid}>
          {NUMBERS.map((n) => (
            <div key={n} className={`${styles.cell} ${styles.skeleton}`} />
          ))}
        </div>
      </section>
    );
  }

  const secondary = lf.secondary_rollover_number;
  const primary = config?.primaryRollOverNumber ?? null;

  const visibleNumbers = NUMBERS.filter((n) => {
    const isRollover = n === secondary || (primary != null && n === primary);
    return !isRollover;
  });

  const betCounts = visibleNumbers.map((n) => ({
    n,
    bets: lf.bets_per_number?.[n] ?? 0n,
  }));

  const totalBets = betCounts.reduce((acc, x) => acc + x.bets, 0n);

  const pctOfBets = (bets: bigint) => {
    if (totalBets === 0n || bets === 0n) return 0;
    return (Number(bets) / Number(totalBets)) * 100;
  };

  const pctOfBetsLabel = (bets: bigint) => {
    if (totalBets === 0n || bets === 0n) return "0";
    return ((Number(bets) / Number(totalBets)) * 100).toFixed(1);
  };


  // Most Popular (max bets) — only if unique
  const maxBets = betCounts.reduce((m, x) => (x.bets > m ? x.bets : m), 0n);
  const mostPopularList = betCounts.filter((x) => x.bets === maxBets).map((x) => x.n);
  const mostPopular = mostPopularList.length === 1 ? mostPopularList[0] : null;


// Most Profitable = the least bets (including zero), only if unique
  const minBets = betCounts.reduce(
    (min, x) => (x.bets < min ? x.bets : min),
    betCounts[0]?.bets ?? 0n
  );

  const mostProfitableList = betCounts
    .filter((x) => x.bets === minBets)
    .map((x) => x.n);

  const mostProfitable =
    mostProfitableList.length === 1 ? mostProfitableList[0] : null;

  return (
    <section className={styles.root}>
      <div className={styles.grid}>
        {visibleNumbers.map((n) => {
          const i = n;
          const bets = lf.bets_per_number?.[i] ?? 0n;

          const share = pctOfBets(bets); // float percent 0..100
          const meterWidth = Math.max(0, Math.min(100, Math.round(share))); // clean integer for bar

          const isPopular = n === mostPopular;
          const isProfitable = n === mostProfitable;

          const bump =
            (fx?.changedBetsIndices?.includes(i) ?? false) ||
            (fx?.changedLamportsIndices?.includes(i) ?? false);

          const style: CSSVars = {
            "--hue": String(HUE_BY_NUMBER[n] ?? 50),
          };

          return (
            <div
              key={n}
              style={style}
              className={`${styles.cell} ${bump ? styles.bump : ""}`}
            >
              <div className={styles.badges}>
                {isPopular && <span className={styles.badge}>Most Popular</span>}
                {isProfitable && (
                  <span className={`${styles.badge} ${styles.badgeAlt}`}>Most Profitable</span>
                )}
              </div>

              <div className={styles.topRow}>
                <div className={styles.num}>{n}</div>
                <div className={styles.bets}>
                  <div className={styles.predictionsLabel}>
                    <Image src="/SVG/ball-1.svg" width={18} height={18} alt="Predictions" />
                  </div>
                  <div className={styles.predictionsCount}>{formatBigInt(bets)}</div>
                </div>

              </div>

              <div className={styles.meta}>

                <div className={styles.share}>{pctOfBetsLabel(bets)}% of predictions</div>
              </div>

              <div className={styles.meter} aria-label={`Bet share ${meterWidth}%`}>
                <div className={styles.meterFill} style={{ width: `${meterWidth}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}