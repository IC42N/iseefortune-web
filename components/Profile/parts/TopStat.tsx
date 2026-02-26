import { ReactNode } from 'react';
import styles from "./TopStat.module.scss"

type Tone = "success" | "danger" | "warning" | "info";

export function TopStatCard({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`${styles.topStatsCard} ${styles[tone]}`}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}