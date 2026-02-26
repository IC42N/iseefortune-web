"use client";

import * as React from "react";
import styles from "@/components/BetModal/BetModal.module.scss";
import { HUE_BY_NUMBER, type CSSVars } from "@/utils/colors";
import type { BetModalMode, BetTypeId } from "@/state/betting-atom";
import { motion, AnimatePresence } from "framer-motion";
import { lamportsToSolTextFloor } from "@/utils/solana_helper";
import { BreakdownRow } from '@/components/BetModal/Parts/BreakdownRow';
import { NumberChips } from '@/components/BetModal/Parts/NumberChips';

export type BetSummaryProps = {
  variant?: BetModalMode;

  betType: BetTypeId;
  numbers?: number[];

  // total bet amount (always)
  selectedSolText: string; // e.g. "0.25" or ""
  usdText?: string | null;

  // per-pick amount (optional; we compute from lamports if provided)
  perPickSolText?: string | null;

  // insight section (single-only)
  sharePctText?: string | null;
  numberPoolSolText?: string | null;
  estPayoutSolText?: string | null;
  estPayoutUsdText?: string | null;
  playerCountText?: string | null;

  // breakdown values (used for addLamports)
  originalSolText?: string | null;
  addedSolText?: string | null;
  totalSolText?: string | null;

  originalUsdText?: string | null;
  addedUsdText?: string | null;
  totalUsdText?: string | null;

  quip?: string | null;

  // Lamports (recommended)
  originalLamports?: bigint | null;
  addedLamports?: bigint | null;
  totalLamports?: bigint | null;
  selectedLamports?: bigint | null; // for non-add view
};



export default function BetSummary({
 variant = "new",

 betType,
 numbers = [],

 selectedSolText,
 usdText = null,

 sharePctText = null,
 numberPoolSolText = null,
 estPayoutSolText = null,
 estPayoutUsdText = null,
 playerCountText = null,

 originalSolText = null,
 addedSolText = null,
 totalSolText = null,

 originalUsdText = null,
 addedUsdText = null,
 totalUsdText = null,

 quip = null,
 originalLamports = null,
 addedLamports = null,
 totalLamports = null,
 selectedLamports = null,
}: BetSummaryProps) {
  const isAdd = variant === "addLamports";
  const picksCount = numbers.length;

  // Single bet = exactly 1 number. Only single shows insight/payout.
  const isSingle = betType === 0 && picksCount === 1;
  const isSplit = picksCount > 1;


  const splitAlloc = React.useMemo(() => {
    if (!isSplit) return null;
    if (selectedLamports == null) return null;

    const STEP_LAMPORTS = 100_000n; // 0.0001 SOL
    const k = BigInt(picksCount);
    if (k <= 1n) return null;

    const denom = k * STEP_LAMPORTS;
    const chunks = selectedLamports / denom;

    const perPickLamports = chunks * STEP_LAMPORTS;
    const normalizedTotalLamports = perPickLamports * k;

    return {
      perPickLamports,
      normalizedTotalLamports,
    };
  }, [isSplit, selectedLamports, picksCount]);

  const displayTotalLamports = React.useMemo(() => {
    if (!isSplit) return selectedLamports;
    return splitAlloc?.normalizedTotalLamports ?? selectedLamports;
  }, [isSplit, splitAlloc, selectedLamports]);

  const displayTotalSolText = React.useMemo(() => {
    if (displayTotalLamports == null) return selectedSolText;
    // 4 decimals because you want 0.0001 max
    return lamportsToSolTextFloor(displayTotalLamports, 4);
  }, [displayTotalLamports, selectedSolText]);


  // For styling accents: single uses its number hue; multi uses average hue.
  const hue = React.useMemo(() => {
    if (!numbers.length) return 50;

    if (isSingle) return HUE_BY_NUMBER[numbers[0]] ?? 50;

    const avg = numbers.reduce((s, n) => s + (HUE_BY_NUMBER[n] ?? 50), 0) / numbers.length;
    return Math.round(avg);
  }, [numbers, isSingle]);

  const numberStyle = { "--hue": String(hue) } as CSSVars;

  const hasInsight =
    isSingle &&
    (!!sharePctText || !!numberPoolSolText || !!playerCountText || !!estPayoutSolText);

  const [insightOpen, setInsightOpen] = React.useState(false);

  const displayPerPickSolText = React.useMemo(() => {
    if (!isSplit) return null;

    const perPickLamports = splitAlloc?.perPickLamports;
    if (perPickLamports == null) return null;

    const DISPLAY_STEP_LAMPORTS = 1_000_000n; // 0.001 SOL
    const stepped = (perPickLamports / DISPLAY_STEP_LAMPORTS) * DISPLAY_STEP_LAMPORTS; // floor

    return lamportsToSolTextFloor(stepped, 3); // exactly 3 decimals
  }, [isSplit, splitAlloc?.perPickLamports]);


  return (
    <div className={styles.summary}>

      {isSplit ? (
        <div className={styles.summaryTable}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Numbers selected</span>
            <span className={styles.summaryValue}>
              <NumberChips numbers={numbers} />
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>SOL on each number</span>
            <span className={styles.summaryValueStrong}>
            {displayPerPickSolText} SOL
          </span>
          </div>

          <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
              <span className={styles.summaryLabel}>Total SOL</span>
              <span className={styles.summaryValueTotal}>
                {displayTotalSolText} SOL
              </span>
          </div>
        </div>
      ) : (


      <div className={styles.summaryLine}>
          <div className={styles.summaryLeft}>
            <span className={styles.summaryPrediction}>SUMMARY</span>

            {hasInsight && selectedSolText && (
              <AnimatePresence>
                <motion.button
                  key="insight"
                  type="button"
                  className={`${styles.tipBadge} ${styles.insightBtn}`}
                  aria-expanded={insightOpen}
                  aria-controls="bet-summary-insight"
                  onClick={() => setInsightOpen((p) => !p)}
                  title={insightOpen ? "Hide insight" : "Show insight"}
                  initial={{ opacity: 0, scale: 0.85, y: 4, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.9, y: 2, filter: "blur(4px)" }}
                  transition={{ type: "spring", stiffness: 520, damping: 30 }}
                >
                  <motion.span
                    animate={insightOpen ? {} : { scale: [1, 1.1, 1], opacity: [1, 0.85, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className={styles.insightIcon}
                    aria-hidden
                  >
                    💡
                  </motion.span>
                </motion.button>
              </AnimatePresence>
            )}
          </div>

          {isAdd ? (
            <div className={styles.summaryBreakdown}>
              <BreakdownRow
                label="Current"
                sol={originalSolText}
                usd={originalUsdText}
                numbers={numbers}
                lamports={originalLamports}
              />

              {addedSolText ? (
                <BreakdownRow
                  label="Adding"
                  sol={addedSolText}
                  usd={addedUsdText}
                  numbers={numbers}
                  lamports={addedLamports}
                />
              ) : null}

              <BreakdownRow
                label="New total"
                sol={totalSolText}
                usd={totalUsdText}
                isTotal
                numbers={numbers}
                lamports={totalLamports}
              />
            </div>
          ) : (
          selectedSolText ? (
              <div style={numberStyle}>
                  <b>{selectedSolText}</b>
                  {" SOL "}
                  {usdText ? <span className={styles.summaryMuted}>({usdText})</span> : null}
                  <span className={styles.summaryMuted}> on </span>
                  {numbers.length ? <NumberChips numbers={numbers} /> : <span className={styles.summaryMuted}>Pick numbers</span>}
              </div>
            ) : null
          )}
      </div>

      )}

      {hasInsight && (
        <div
          id="bet-summary-insight"
          className={`${styles.summaryMeta} ${insightOpen ? styles.summaryMetaOpen : styles.summaryMetaClosed}`}
        >
          {playerCountText ? (
            <div className={styles.summaryMetaItem}>
              <span className={styles.summaryMetaLabel}>Total Players</span>
              <span className={styles.summaryMetaValue}>{playerCountText}</span>
            </div>
          ) : null}

          {sharePctText ? (
            <div className={styles.summaryMetaItem}>
              <span className={styles.summaryMetaLabel}>Your share</span>
              <span className={styles.summaryMetaValue}>{sharePctText}</span>
            </div>
          ) : null}

          {numberPoolSolText ? (
            <div className={styles.summaryMetaItem}>
              <span className={styles.summaryMetaLabel}>On #{numbers[0]}</span>
              <span className={styles.summaryMetaValue}>{numberPoolSolText} SOL</span>
            </div>
          ) : null}

          {estPayoutSolText ? (
            <div className={styles.summaryMetaItem}>
              <span className={styles.summaryMetaLabel}>Expected Payout</span>
              <span className={styles.summaryMetaValue}>
                ~{estPayoutSolText} SOL{" "}
                {estPayoutUsdText ? <span className={styles.summaryMuted}>({estPayoutUsdText})</span> : null}
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/*{quip ? <div className={styles.summaryQuip}>{quip}</div> : null}*/}
    </div>
  );
}