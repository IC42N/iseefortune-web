"use client";

import styles from "../EpochResultsModal.module.scss";
import type { ResultCopy } from "@/utils/result-copy";
import { formatBps } from '@/utils/decoder';

type Props = {
  copy: ResultCopy;
  prevFeeBps?: number | null;
  newFeeBps?: number | null;
};


export default function Rollover({ copy, prevFeeBps = null, newFeeBps = null }: Props) {
  const hasNumbers = typeof prevFeeBps === "number" && typeof newFeeBps === "number";
  const reduced = hasNumbers && newFeeBps < prevFeeBps;

  return (
    <div className={styles.rolloverBanner}>
      <div className={styles.rolloverHeadline}>ROLLOVER</div>

      {copy.body && <div className={styles.rolloverBody}>{copy.body}</div>}

      {reduced ? (
        <div className={styles.rolloverMeta}>
          Taker fee reduced from <b>{formatBps(prevFeeBps)}</b> to{" "}
          <b>{formatBps(newFeeBps)}</b>.
        </div>
      ) : typeof newFeeBps === "number" ? (
        <div className={styles.rolloverMeta}>
          Current taker fee: <b>{formatBps(newFeeBps)}</b>.
        </div>
      ) : (
        <div className={styles.rolloverMeta}>
          Fees may adjust for the next round.
        </div>
      )}
    </div>
  );
}