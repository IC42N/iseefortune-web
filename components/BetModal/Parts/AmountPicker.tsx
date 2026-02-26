"use client";

import { ComponentProps, CSSProperties } from 'react';
import styles from "@/components/BetModal/BetModal.module.scss";
import { BetModalMode } from "@/state/betting-atom";

type AmountPickerProps = {
  variant?: BetModalMode;

  // display
  selectedSolText: string; // NEW: amount OR add-delta (no "+" included)
  selectedUsdText: string; // NEW: amount USD OR add-delta USD (parent decides)
  tierRangeText: string;

  // slider state
  idx: number;
  maxIndex: number;
  stepCount: number;
  sliderWrapStyle: CSSProperties;

  // wallet + warnings
  publicKeyPresent: boolean;
  walletCappedMaxSolText: string | null;
  walletBalanceSolText: string | null;
  insufficientFunds: boolean;

  // gating
  bettingClosed: boolean;
  lockAmount?: boolean;

  // actions
  onMinAction: () => void;
  onMaxAction: () => void;
  onIdxChangeAction: (nextIdx: number) => void;
};

function clampInt(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}

export default function AmountPicker({
   variant = "new",
   selectedSolText,
   selectedUsdText,
   tierRangeText,

   idx,
   maxIndex,
   stepCount,
   sliderWrapStyle,

   publicKeyPresent,
   walletCappedMaxSolText,
   walletBalanceSolText,
   insufficientFunds,

   bettingClosed,
   lockAmount = false,

   onMinAction,
   onMaxAction,
   onIdxChangeAction,
 }: AmountPickerProps) {
  const disabled = bettingClosed || stepCount <= 0 || lockAmount;
  const isAdd = variant === "addLamports";

  const label = isAdd ? "Increase Amount" : "Amount";

  const helper = isAdd
    ? "Slide to choose how much to add. Your total bet will update automatically."
    : "Select an amount within the tier range. Values are in 0.01 SOL increments.";


  const dec = () => {
    const next = clampInt(idx - 1, 0, maxIndex);
    onIdxChangeAction(next);
  };

  const inc = () => {
    const next = clampInt(idx + 1, 0, maxIndex);
    onIdxChangeAction(next);
  };

  return (
    <div className={styles.amountBox}>

      <div className={styles.fieldLabelRow}>
        <div className={styles.fieldLabel}>{label}</div>
        <div className={styles.rangeInfo}>
          <span className={styles.range}>TIER Range: {tierRangeText}</span>
        </div>
      </div>

      <div className={styles.sliderTop}>
        <div className={styles.sliderValue}>
          <span className={styles.sliderValueNum}>
            {isAdd ? (
              <>
                <span style={{ fontWeight: 700 }}>+{selectedSolText}</span> SOL
              </>
            ) : (
              <>
                <span style={{ fontWeight: 700 }}>{selectedSolText}</span> SOL
              </>
            )}
          </span>

          {/* USD line: parent should pass delta USD in add mode */}
          <span className={styles.sliderValueUsd}>{selectedUsdText}</span>
        </div>

        <div className={styles.sliderBtns}>
          <button
            type="button"
            className={styles.minBtn}
            onClick={onMinAction}
            disabled={disabled}
            title={disabled ? "Unavailable" : undefined}
          >
            MIN
          </button>

          <button
            type="button"
            className={styles.maxBtn}
            onClick={onMaxAction}
            disabled={disabled}
            title={disabled ? "Unavailable" : undefined}
          >
            MAX
          </button>
        </div>
      </div>

      <div className={styles.sliderRow} style={sliderWrapStyle}>
        <button
          type="button"
          className={styles.stepBtn}
          onClick={dec}
          disabled={disabled || idx <= 0}
          aria-label="Decrease amount"
          title={disabled ? "Unavailable" : "Decrease"}
        >
          <MinusIcon />
        </button>

        <div className={styles.sliderWrap}>
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={maxIndex}
            step={1}
            value={idx}
            disabled={disabled}
            onChange={(e) => {
              const next = clampInt(Number(e.target.value), 0, maxIndex);
              onIdxChangeAction(next);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>

        <button
          type="button"
          className={styles.stepBtn}
          onClick={inc}
          disabled={disabled || idx >= maxIndex}
          aria-label="Increase amount"
          title={disabled ? "Unavailable" : "Increase"}
        >
          <PlusIcon />
        </button>
      </div>

      <div className={styles.amountHint}>
        {!publicKeyPresent ? (
          <span className={styles.hintMuted}>Connect wallet to compare balance</span>
        ) : walletBalanceSolText == null ? (
          <span className={styles.hintMuted}>Fetching wallet balance…</span>
        ) : walletCappedMaxSolText == null ? (
          <span className={styles.hintMuted}>Wallet max unavailable…</span>
        ) : (
          <span >Wallet Balance: {walletBalanceSolText} SOL</span>
        )}
      </div>

      {publicKeyPresent && insufficientFunds && (
        <div className={styles.amountWarn}>
          <div>Not enough SOL to submit this update.</div>
          {idx === 0 ? (
            <div>Add funds to continue.</div>
          ) : (
            <div>{isAdd ? "Add funds or reduce the add amount." : "Add funds or reduce the amount."}</div>
          )}
        </div>
      )}
    </div>
  );
}

function PlusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 5H5M10 5H5M5 5V0M5 5V10" />
    </svg>
  );
}

function MinusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 5H10" />
    </svg>
  );
}