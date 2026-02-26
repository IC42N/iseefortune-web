import { ReactNode } from 'react';
import styles from "./BottomStat.module.scss";

type Tone = "success" | "danger" | "neutral";

export function BottomStatCard({
 label,
 value,
 tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`${styles.statCard}`.trim()}>
      <div className={`${styles.statsValue} ${styles[tone]}`}>{value}</div>
      <div className={styles.statLabel}>
        {label}
      </div>
    </div>
  );
}