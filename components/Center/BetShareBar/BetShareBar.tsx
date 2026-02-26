"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import styles from "./BetShareBar.module.scss";
import { liveFeedDecodedAtom, liveFeedFXAtom } from "@/state/live-feed-atoms";
import { formatBigInt } from "@/utils/solana_helper";
import { SlicePopover } from "@/components/Center/BetShareBar/SlicePopover";
import { CSSVars, HUE_BY_NUMBER } from "@/utils/colors";
import { formatPct } from '@/utils/number_helper';

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MIN_FLEX = 0.08;

export default function BetShareBar() {
  const lf = useAtomValue(liveFeedDecodedAtom);
  const fx = useAtomValue(liveFeedFXAtom);

  const excluded = lf?.secondary_rollover_number ?? null;

  const { slices, hasAnyBets } = useMemo(() => {
    if (!lf) return { slices: [], hasAnyBets: false };

    // exclude only affects which numbers we SHOW (and totals math)
    const shownNumbers = excluded != null ? ALL.filter((n) => n !== excluded) : ALL;

    const items = shownNumbers.map((n) => {
      const i = n; // ✅ index matches number (0 is at index 0)
      return {
        n,
        i,
        bets: lf.bets_per_number?.[i] ?? 0n,
      };
    });

    const totalBets = items.reduce((acc, x) => acc + x.bets, 0n);
    const maxBets = items.reduce((m, x) => (x.bets > m ? x.bets : m), 0n);

    const total = totalBets === 0n ? 1n : totalBets;
    const max = maxBets === 0n ? 1n : maxBets;

    const hasAnyBets = totalBets > 0n;

    const slices = items.map((x) => {
      const share = Number(x.bets) / Number(total);
      const percent = share * 100;
      const intensity = Math.min(1, Math.max(0, Number(x.bets) / Number(max)));

      const changed =
        (fx?.changedBetsIndices?.includes(x.i) ?? false) ||
        (fx?.changedLamportsIndices?.includes(x.i) ?? false);

      const bumpKey = changed ? `b-${x.i}-${fx?.lastUpdateAtMs ?? 0}` : `b-${x.i}`;

      return { ...x, share, percent, intensity, bumpKey };
    });

    return { slices, hasAnyBets };
  }, [
    lf,
    excluded,
    fx?.changedBetsIndices,
    fx?.changedLamportsIndices,
    fx?.lastUpdateAtMs,
  ]);

  // If you *always* have an excluded rollover number when lf exists, keep this.
  // Otherwise, remove `excluded == null` so the bar still shows.
  if (!lf || excluded == null) return null;

  return (
    <section className={styles.root}>
      <div className={styles.bar}>
        {slices.map((s) => {
          const style: CSSVars = {
            "--intensity": String(s.intensity),
            "--hue": String(HUE_BY_NUMBER[s.n] ?? 50),
            ...(hasAnyBets ? { flexGrow: MIN_FLEX + s.share } : { flexGrow: 1 }),
          };

          return (
            <div key={s.n} className={styles.sliceWrap} style={style}>
              <SlicePopover
                side="top"
                title={`Number ${s.n}`}
                description={`Predictions: ${formatBigInt(s.bets)}  • ${formatPct(s.percent)}%`}
              >
                <div className={styles.slice} key={s.bumpKey}>
                  <div className={styles.num}>{s.n}</div>
                  <div className={styles.meta}>
                    {s.percent > 0 && (
                      <div className={styles.percent}>
                        {s.percent >= 10 ? s.percent.toFixed(0) : s.percent.toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              </SlicePopover>
            </div>
          );
        })}
      </div>
    </section>
  );
}