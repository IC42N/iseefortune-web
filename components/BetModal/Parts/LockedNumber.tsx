"use client";

import styles from "@/components/BetModal/BetModal.module.scss";
import { HUE_BY_NUMBER, type CSSVars } from "@/utils/colors";
import { SelectedNumbers } from '@/components/ui/SelectedNumbers/SelectedNumbers';

export default function LockedNumber(props: {
  numbers: number[];       // selected picks
}) {
  const { numbers } = props;

  // Use a stable hue for the wrapper:
  // - if a single pick exists, use that pick's hue
  // - otherwise use the average hue so multi-pick feels intentional
  const hue = (() => {
    if (!numbers.length) return 50;
    if (numbers.length === 1) return HUE_BY_NUMBER[numbers[0]] ?? 50;

    const avg =
      numbers.reduce((s, n) => s + (HUE_BY_NUMBER[n] ?? 50), 0) / numbers.length;
    return Math.round(avg);
  })();

  const v = { "--hue": String(hue) } as CSSVars;

  return (
    <div className={styles.wrap} style={v}>
      <div className={styles.numberRowLocked}>
        <SelectedNumbers numbers={numbers} size={'md'} />
        <div className={styles.textCol}>
          <div className={styles.title}>
            {numbers.length <= 1 ? "Number selected" : "Numbers selected"}
          </div>
        </div>
      </div>
    </div>
  );
}