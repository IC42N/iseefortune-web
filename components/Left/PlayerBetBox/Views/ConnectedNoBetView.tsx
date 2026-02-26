"use client";

import styles from "../PlayerBetBox.module.scss";

export default function ConnectedNoBetView(props: {
  bettingClosed: boolean;
  onPlaceBetAction: () => void;
  canPlaceBet: boolean;
}) {
  const { bettingClosed, onPlaceBetAction, canPlaceBet } = props;

  return (
    <div className={styles.connected}>
      <div className={styles.msgTitle}>
        {bettingClosed ? "Betting is closed" : "What number will come next?"}
      </div>

      <div className={styles.msgSub}>
        Set your prediction before it&#39;s too late.
      </div>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={onPlaceBetAction}
          disabled={!canPlaceBet}
          type="button"
        >
          Submit Prediction
        </button>

        {bettingClosed && (
          <div className={styles.note}>You’ll be able to play again next epoch.</div>
        )}
      </div>

    </div>
  );
}