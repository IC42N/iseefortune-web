"use client";

import { motion, type Variants } from "framer-motion";
import styles from "@/components/BetModal/BetModal.module.scss";
import { HUE_BY_NUMBER, type CSSVars } from "@/utils/colors";
import type { BetModalMode, BetTypeId } from "@/state/betting-atom";
import {
  detectHighLowPreset,
  detectPresetBetType,
  presetHighLow,
} from "@/components/BetModal/number_helper";

/**
 * NumberPicker
 * - Single + Multi selection
 * - lockBetType: lock the Split toggle (changeNumber)
 * - lockPickCount: CAP max selected picks to K (changeNumber)
 *   - user can deselect down to 0
 *   - user can add back up to K
 *   - user can NEVER exceed K
 */
type NumberPickerProps = {
  mode: BetModalMode | null;
  allowedNumbers: readonly number[];
  betType: BetTypeId;
  selectedNumbers?: number[];
  onChangeAction: (next: { betType: BetTypeId; numbers: number[] }) => void;

  bettingClosed: boolean;
  isClosing: boolean;
  lockNumber?: boolean; // locks ALL interactions (used for addLamports)
  isProcessing?: boolean;

  lockBetType?: boolean;          // locks Split toggle only (used for changeNumber)
  lockPickCount?: number | null;  // ENFORCED cap: cannot exceed K (used for changeNumber)
};

// ============================================================================
// Helpers
// ============================================================================
function sortAscUnique(nums: number[]) {
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function filterAllowed(nums: number[], allowed: readonly number[]) {
  const allowedSet = new Set(allowed);
  return nums.filter((n) => allowedSet.has(n));
}

function clampToCap(nums: number[], cap: number | null) {
  if (cap == null) return nums;
  return nums.slice(0, Math.max(0, cap));
}

export default function NumberPicker({
 mode,
 allowedNumbers,
 betType,
 selectedNumbers = [],
 onChangeAction,
 bettingClosed,
 isClosing,
 lockNumber = false,
 isProcessing = false,
 lockBetType = false,
 lockPickCount = null,
}: NumberPickerProps) {
  // ==========================================================================
  // Interaction gating
  // ==========================================================================
  const disabledAll = bettingClosed || isClosing || lockNumber || isProcessing;

  // Split toggle can be locked independently (changeNumber)
  const splitToggleDisabled = disabledAll || lockBetType;

  // UI rule: anything other than single is considered "multi enabled"
  const multiEnabled = betType !== 0;

  // Change-number cap (K). If null -> no cap.
  const cap = lockPickCount;

  // Helpful counts for hints
  const currentCount = selectedNumbers.length;
  const hasPickCountRule = cap != null;

  // ==========================================================================
  // Split toggle handler (single <-> multi)
  // - Disabled when lockBetType is true
  // ==========================================================================
  const toggleMulti = () => {
    if (disabledAll) return;
    if (lockBetType) return;

    if (multiEnabled) {
      // Turning OFF multi -> keep exactly one pick (or fallback)
      const sorted = sortAscUnique(filterAllowed(selectedNumbers, allowedNumbers));
      const keep = sorted[0] ?? (allowedNumbers[0] ?? 1);
      onChangeAction({ betType: 0, numbers: [keep] });
      return;
    }

    // Turning ON multi -> seed with existing valid pick or fallback
    const cur =
      selectedNumbers.find((n) => allowedNumbers.includes(n)) ??
      allowedNumbers[0] ??
      1;

    const nextNumbers = [cur];
    const nextBetType = detectPresetBetType([...allowedNumbers], nextNumbers);
    onChangeAction({ betType: nextBetType, numbers: nextNumbers });
  };

  // ==========================================================================
  // Presets (HIGH / LOW)
  // - Must respect cap in changeNumber
  // ==========================================================================
  const applyPresetHighLow = (side: "low" | "high") => {
    if (disabledAll) return;

    // Build preset set
    let nextNumbers = presetHighLow([...allowedNumbers], side);

    // Enforce cap (K) if present (changeNumber)
    nextNumbers = clampToCap(sortAscUnique(nextNumbers), cap);

    // If bet type is locked, keep current betType
    const nextBetType = lockBetType
      ? betType
      : detectPresetBetType([...allowedNumbers], nextNumbers);

    onChangeAction({ betType: nextBetType, numbers: nextNumbers });
  };

  // ==========================================================================
  // Number click handler
  // - Key behavior: NEVER allow adding above cap (K) in changeNumber
  // - Still allow deselect down to 0 and rebuild
  // ==========================================================================
  const onPickClick = (n: number) => {
    if (disabledAll) return;

    const isSelected = selectedNumbers.includes(n);

    // SINGLE
    if (!multiEnabled) {
      if (isSelected) {
        // Optional: allow reset to empty only in changeNumber
        if (mode === "changeNumber") {
          onChangeAction({ betType: 0, numbers: [] });
        }
        return;
      }

      onChangeAction({ betType: 0, numbers: [n] });
      return;
    }

    // MULTI
    if (isSelected) {
      // Always allow deselect
      const next = sortAscUnique(selectedNumbers.filter((x) => x !== n));
      const nextBetType = lockBetType
        ? betType
        : detectPresetBetType([...allowedNumbers], next);

      onChangeAction({ betType: nextBetType, numbers: next });
      return;
    }

    // ADDING:
    // If cap exists and we're already at cap, block the add.
    if (cap != null && selectedNumbers.length >= cap) {
      return; // (optional: trigger a tiny shake animation here)
    }

    const next = sortAscUnique([...selectedNumbers, n]);
    const nextBetType = lockBetType
      ? betType
      : detectPresetBetType([...allowedNumbers], next);

    onChangeAction({ betType: nextBetType, numbers: next });
  };

  // ==========================================================================
  // UI state (active HIGH/LOW)
  // ==========================================================================
  const hlActive = multiEnabled
    ? detectHighLowPreset([...allowedNumbers], selectedNumbers)
    : null;

  const lowActive = hlActive === "low";
  const highActive = hlActive === "high";

  const presetBtnVariants: Variants = {
    idle: {
      y: 0,
      filter: "brightness(1)",
      transition: { type: "spring", stiffness: 500, damping: 30 },
    },
    active: {
      y: -1,
      filter: "brightness(1.08)",
      transition: { type: "spring", stiffness: 500, damping: 22 },
    },
  };

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className={[styles.selectNumberBox, styles[`numberBox--${mode}`]].join(" ")}>
      {/* Header row */}
      <div className={styles.fieldLabelRow}>
        <div className={styles.fieldLabel}>What will it be?</div>

        {/* Split toggle */}
        <button
          type="button"
          className={[
            styles.multiToggle,
            multiEnabled ? styles.on : styles.off,
            lockBetType ? styles.multiToggleLocked : "",
          ].join(" ")}
          disabled={splitToggleDisabled}
          onClick={toggleMulti}
          aria-pressed={multiEnabled}
          title={
            lockBetType
              ? "Split mode is locked for change-number"
              : lockNumber
                ? "Number selection is locked in this mode"
                : undefined
          }
        >
          <span className={styles.label}>Split</span>
          <span className={styles.switch}>
            <span className={styles.knob} />
          </span>
        </button>
      </div>

      {/* Presets + grid */}
      <div className={styles.numberRowBox}>
        {multiEnabled && (
          <div className={styles.highLowBox}>
            <motion.button
              type="button"
              className={`${styles.lowBtn} ${lowActive ? styles.presetActive : ""}`}
              disabled={disabledAll}
              onClick={() => applyPresetHighLow("low")}
              aria-pressed={lowActive}
              whileHover={!disabledAll ? { scale: 1.02 } : undefined}
              whileTap={!disabledAll ? { scale: 0.98 } : undefined}
              animate={lowActive ? "active" : "idle"}
              variants={presetBtnVariants}
              title={cap != null ? `Select LOW (max ${cap})` : "Select LOW preset"}
            >
              <span className={styles.hlText}>LOW</span>
            </motion.button>

            <motion.button
              type="button"
              className={`${styles.highBtn} ${highActive ? styles.presetActive : ""}`}
              disabled={disabledAll}
              onClick={() => applyPresetHighLow("high")}
              aria-pressed={highActive}
              whileHover={!disabledAll ? { scale: 1.02 } : undefined}
              whileTap={!disabledAll ? { scale: 0.98 } : undefined}
              animate={highActive ? "active" : "idle"}
              variants={presetBtnVariants}
              title={cap != null ? `Select HIGH (max ${cap})` : "Select HIGH preset"}
            >
              <span className={styles.hlText}>HIGH</span>
            </motion.button>
          </div>
        )}

        <div className={styles.numberRow}>
          {allowedNumbers.map((n) => {
            const active = selectedNumbers.includes(n);
            const style: CSSVars = { "--hue": String(HUE_BY_NUMBER[n] ?? 50) };

            return (
              <motion.button
                key={n}
                type="button"
                style={style}
                className={`${styles.numBtn} ${active ? styles.numBtnActive : ""}`}
                aria-pressed={active}
                disabled={disabledAll}
                onClick={() => onPickClick(n)}
                initial={false}
                animate={active ? "selected" : "idle"}
                whileHover={!disabledAll ? "hover" : undefined}
                whileTap={!disabledAll ? "tap" : undefined}
                variants={tileVariants}
              >
                <motion.span
                  className={styles.numBtnShimmer}
                  aria-hidden="true"
                  initial={false}
                  animate={
                    disabledAll
                      ? isProcessing
                        ? "processing"
                        : "off"
                      : active
                        ? "selected"
                        : "hoverReady"
                  }
                  variants={shimmerVariants}
                />

                <motion.span
                  className={styles.numBtnRing}
                  aria-hidden="true"
                  initial={false}
                  animate={active ? "on" : "off"}
                  variants={ringVariants}
                />

                <span className={styles.numBtnText}>{n}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Status / hints */}
      {isProcessing && <div className={styles.numberProcessingHint}>Selecting…</div>}

      {hasPickCountRule && !disabledAll ? (
        <div className={styles.selectHelpText}>
          Select exactly <b>{cap}</b> numbers{" "}
          <span className={styles.summaryMuted}>
            (currently <b>{currentCount}</b>)
          </span>
        </div>
      ) : null}

      {!hasPickCountRule && multiEnabled && !disabledAll && selectedNumbers.length < 2 ? (
        <div className={styles.selectHelpText}>
          Select at least <b>2</b> numbers to continue
        </div>
      ) : null}
    </div>
  );
}

/* Animations unchanged */
const tileVariants: Variants = {
  idle: {
    scale: 1,
    y: 0,
    rotate: 0,
    transition: {
      scale: { type: "spring", stiffness: 520, damping: 32 },
      y: { type: "spring", stiffness: 520, damping: 32 },
      rotate: { type: "spring", stiffness: 520, damping: 32 },
    },
  },
  hover: {
    scale: 1.06,
    rotate: [0, 0, 0, 0, 0],
    transition: {
      scale: { type: "spring", stiffness: 400, damping: 15 },
      rotate: { type: "tween", duration: 0.28, ease: "easeOut" },
    },
  },
  tap: {
    scale: 0.96,
    transition: { type: "spring", stiffness: 650, damping: 22 },
  },
  selected: {
    scale: 1.07,
    rotate: [0, 0.6, -0.6, 0.4, 0],
    transition: {
      scale: { type: "spring", stiffness: 520, damping: 18 },
      rotate: { type: "tween", duration: 0.22, ease: "easeOut" },
    },
  },
};

const shimmerVariants: Variants = {
  off: { opacity: 0, x: "-140%" },
  hoverReady: {
    opacity: 0.22,
    x: ["-180%", "180%"],
    transition: {
      type: "tween",
      duration: 2.8,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 7,
    },
  },
  selected: {
    opacity: 0.2,
    x: ["-140%", "140%"],
    transition: {
      type: "tween",
      duration: 2.8,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 7,
    },
  },
  processing: {
    opacity: 0.1,
    x: ["-140%", "140%"],
    transition: {
      type: "tween",
      duration: 2.8,
      ease: "linear",
      repeat: Infinity,
      repeatDelay: 7,
    },
  },
};

const ringVariants: Variants = {
  off: { opacity: 0, scale: 0.92 },
  on: {
    opacity: 1,
    scale: [0.95, 1.02, 0.98, 1.0],
    transition: { duration: 0.7, ease: "easeOut" },
  },
};