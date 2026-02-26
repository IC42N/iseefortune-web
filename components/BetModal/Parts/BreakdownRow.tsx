import { lamportsToSolTextFloor } from '@/utils/solana_helper';
import styles from "@/components/BetModal/BetModal.module.scss";
import { useMemo } from 'react';

function formatPickList(numbers: number[]) {
  return numbers
    .slice()
    .sort((a, b) => a - b)
    .map((n) => `#${n}`)
    .join(", ");
}

export function BreakdownRow({
  label,
  sol,
  usd,
  isTotal,
  numbers = [],
  lamports = null,
  maxPerPickDecimals = 6,
}: {
  label: string;
  sol?: string | null;
  usd?: string | null;
  isTotal?: boolean;

  numbers?: number[];
  lamports?: bigint | null;
  maxPerPickDecimals?: number;
}) {
  const hasSol = !!sol && sol.trim() !== "" && sol !== "—";
  const hasUsd = !!usd && usd.trim() !== "" && usd !== "—";
  const isSplit = (numbers?.length ?? 0) > 1;

  const perPickSolText = useMemo(() => {
    if (!isSplit) return null;
    if (lamports == null) return null;
    const k = BigInt(numbers.length);
    if (k <= 1n) return null;

    // No rounding up
    return lamportsToSolTextFloor(lamports / k, maxPerPickDecimals);
  }, [isSplit, lamports, numbers.length, maxPerPickDecimals]);

  const picksText = isSplit ? formatPickList(numbers) : null;

  return (
    <div className={`${styles.summaryBreakdownRow} ${isTotal ? styles.isTotal : ""}`}>
      <span className={styles.summaryMuted}>{label}</span>

      <span>
        {hasSol ? (
          <>
            {label === "Adding" ? "+" : null}

            {isSplit ? (
              <>
                <span className={styles.summaryMuted}>Splitting </span>
                <b>{sol}</b> SOL{" "}
                <span className={styles.summaryMuted}>on </span>
                <b>{picksText}</b>
                {perPickSolText ? (
                  <span className={styles.summaryMuted}> ({perPickSolText} SOL each)</span>
                ) : null}
              </>
            ) : (
              <>
                <b>{sol}</b> SOL
              </>
            )}
          </>
        ) : null}

        {hasUsd ? <span className={styles.summaryMuted}> ({usd})</span> : null}
      </span>
    </div>
  );
}