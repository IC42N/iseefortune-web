"use client";

import styles from "../PlayerBetBox.module.scss";
import type { BetSummaryVm } from "@/utils/bet-summary-vm";
import * as React from "react";
import { PredictionReady } from '@/state/prediction-atoms';
import { SelectedNumbers } from '@/components/ui/SelectedNumbers/SelectedNumbers';

export default function ConnectedHasBetView(props: {
  betSummaryVm: BetSummaryVm | null;
  bettingClosed: boolean;
  myPrediction: PredictionReady;
  myBetAmountText: string;
  changeTickets: number;
  canChangeNumber: boolean;
  onAddLamportsAction: () => void;
  onChangeNumberAction: () => void;
}) {
  const {
    betSummaryVm,
    bettingClosed,
    myPrediction,
    myBetAmountText,
    changeTickets,
    canChangeNumber,
    onAddLamportsAction,
    onChangeNumberAction,
  } = props;


  // Pull everything from VM (and keep your number from bet)
  const numbers = myPrediction.selections;

  const sharePctText = betSummaryVm?.sharePctText ?? null;
  const estPayoutSolText = betSummaryVm?.estPayoutSolText ?? null;
  const estPayoutUsdText = betSummaryVm?.estPayoutUsdText ?? null;
  const hasAnyInsight =  !!sharePctText || !!estPayoutSolText;


  const payoutTitle =
    estPayoutUsdText ? `${estPayoutUsdText}` : `~${estPayoutSolText} SOL`;

  return (
    <div className={styles.connected}>

      <div className={styles.msgTitle}>
        {bettingClosed ? "Prediction locked in" : "Your prediction is set"}
      </div>

      <div className={styles.myPrediction}>
        <div className={styles.wrap}>
          <div className={styles.numberRow}>
            <SelectedNumbers numbers={numbers} />
          </div>
        </div>
        <div className={styles.solAmount}>
          <strong>{myBetAmountText}</strong> SOL
        </div>
      </div>


      {hasAnyInsight ? (
        <div className={styles.summaryMeta}>

          {sharePctText && (
            <div className={styles.summaryMetaItem}>
              <span className={styles.summaryMetaValue}>{sharePctText}</span>
              <span className={styles.summaryMetaLabel}>Current share</span>
            </div>
          )}

          {estPayoutSolText && (
            <div className={styles.summaryMetaItem}>
              <span className={styles.summaryMetaValue} title={payoutTitle}>
                  ~{estPayoutSolText} SOL{" "}
                {estPayoutUsdText ? (
                  <span className={styles.summaryMuted}>({estPayoutUsdText})</span>
                ) : null}
              </span>
              <span className={styles.summaryMetaLabel}>Expected payout</span>
            </div>
          )}
        </div>
      ) : null}


      {bettingClosed ? (
        <div className={styles.closedNotice}>Predictions are sealed for this epoch.</div>
      ) : (
        <div className={styles.actions}>
          <button
            className={styles.secondaryBtn}
            onClick={onAddLamportsAction}
            disabled={bettingClosed}
            type="button"
          >
            Increase Stake
          </button>

          {canChangeNumber ?
            <button
              className={styles.secondaryBtn}
              onClick={onChangeNumberAction}
              disabled={!canChangeNumber}
              title={
                bettingClosed
                  ? "Betting is closed"
                  : changeTickets <= 0
                    ? "No change tickets available"
                    : undefined
              }
              type="button"
            >
              Change Number
            </button>
            : null}

        </div>
      )}
    </div>
  );
}