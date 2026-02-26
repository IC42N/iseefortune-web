"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import styles from "./GameInfoSection.module.scss";

import { liveFeedDecodedAtom } from "@/state/live-feed-atoms";
import { configReadyAtom } from "@/state/config-atoms";
import { numberToCSSVars } from '@/utils/colors';
import { InfoTooltip } from '@/components/ui/InfoTooltop/InfoToolTip';
import { tierPredictionsAtom } from '@/state/prediction-atoms';

function isExcludedNumber(n: number, secondary: number | null, primary: number | null) {
  if (n === 0) return true; // never show 0
  if (secondary != null && n === secondary) return true;
  return primary != null && n === primary;
}

// function formatTopNums(nums: number[]) {
//   if (nums.length === 0) return "—";
//   if (nums.length > 4) return "-"; // Was multiple buy changing it to dash for now.
//   return nums.map((n) => `#${n}`).join(" ");
// }

function NumberChips({
 nums,
 intensity = 0.9,
}: {
  nums: number[];
  intensity?: number;
}) {
  if (nums.length === 0) return <span className={styles.dash}>—</span>;
  if (nums.length > 3) return <span className={styles.dash}>—</span>;

  return (
    <span className={styles.chips}>
      {nums.map((n) => (
        <span
          key={n}
          className={styles.chip}
          style={numberToCSSVars(n, intensity)}
          aria-label={`Number ${n}`}
          title={`#${n}`}
        >
          {n}
        </span>
      ))}
    </span>
  );
}


export default function GameInfoSection() {
  const lf = useAtomValue(liveFeedDecodedAtom);
  const config = useAtomValue(configReadyAtom);

  // ✅ total players from your bet map (1 bet per wallet)
  const tierPredictions = useAtomValue(tierPredictionsAtom);
  const totalPlayers = tierPredictions.size;

  const computed = useMemo(() => {
    if (!lf) {
      return {
        totalBets: 0n,
        totalLamports: 0n,
        mostPopular: [] as number[],
        mostProfitable: [] as number[],
      };
    }

    const secondary = lf.secondary_rollover_number ?? null;
    const primary = config?.primaryRollOverNumber ?? null;

    let totalBets = 0n;
    let totalLamports = 0n;

    let maxBets: bigint | null = null;
    const mostPopular: number[] = [];

    let minLamports: bigint | null = null;
    const mostProfitable: number[] = [];

    for (let n = 1; n <= 9; n++) {
      if (isExcludedNumber(n, secondary, primary)) continue;

      const i = n; // index == number
      const bets = lf.bets_per_number?.[i] ?? 0n;
      const lamports = lf.lamports_per_number?.[i] ?? 0n;

      totalBets += bets;
      totalLamports += lamports;

      // --- Most Popular (max bets, ties allowed)
      if (maxBets == null || bets > maxBets) {
        maxBets = bets;
        mostPopular.length = 0;
        mostPopular.push(n);
      } else if (bets === maxBets) {
        mostPopular.push(n);
      }

      // --- Most Profitable (min lamports INCLUDING 0, ties allowed)
      if (minLamports == null || lamports < minLamports) {
        minLamports = lamports;
        mostProfitable.length = 0;
        mostProfitable.push(n);
      } else if (lamports === minLamports) {
        mostProfitable.push(n);
      }
    }

    // keep display stable
    mostPopular.sort((a, b) => a - b);
    mostProfitable.sort((a, b) => a - b);

    return { totalBets, totalLamports, mostPopular, mostProfitable };
  }, [lf, config?.primaryRollOverNumber]);

  //const totalBetsText = lf ? formatBigInt(computed.totalBets) : "—";
  const totalPlayersText = lf ? String(totalPlayers) : "—";

  return (
    <section className={styles.box}>

      <div className={styles.stat}>
        <span className={styles.label}>Total Players
          <InfoTooltip title="Total Players" description="Total number of players currently participating in this game tier" hideOnMobile={true}/>
        </span>
        <span className={styles.value}>{totalPlayersText}</span>
      </div>

      <div className={styles.stat}>
        <span className={styles.label}>Most Popular
          <InfoTooltip title="Most Popular Number" description="This shows which numbers currently have the most predictions. If a number has many predictions your cut will depend more on your contribution." hideOnMobile={true}/>
        </span>
        <span className={styles.value}>
        {lf ? <NumberChips nums={computed.mostPopular} /> : "—"}
      </span>
      </div>

      <div className={styles.stat}>
        <span className={styles.label}>Most Profitable
        <InfoTooltip title="Most Profitable" description="This shows which numbers currently have the least predictions. If a number has few predictions you will most likely be taking a higher cut of the winnings." hideOnMobile={true}/>
        </span>
        <span className={styles.value}>
        {lf ? <NumberChips nums={computed.mostProfitable} /> : "—"}
      </span>
      </div>
    </section>
  );
}