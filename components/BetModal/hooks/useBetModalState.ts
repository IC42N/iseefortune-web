"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useAtomValue } from "jotai";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey} from '@solana/web3.js';
import { liveFeedDecodedAtom } from "@/state/live-feed-atoms";
import { epochAtom } from "@/state/global-atoms";
import { selectedTierSettingsUiAtom } from "@/state/tier-atoms";

import { HUE_BY_NUMBER } from "@/utils/colors";
import { roundDownToStep, STEP_LAMPORTS } from "@/utils/betting";
import { lamportsToSolTextTrim } from '@/utils/solana_helper';

// keep a tiny buffer so “max” doesn’t brick on fees/rent/etc.
const FEE_BUFFER_LAMPORTS = 50_000n;

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type UseBetModalStateArgs = {
  open: boolean;
  disabled?: boolean;
  closeMs?: number;

  onCloseAction: () => void;

  onConfirmFieldsAction: (fields: {
    player: PublicKey;
    tierId: number;
    epoch: number;
    number: number;
    lamports: bigint;
  }) => void;

  onResetFieldsAction: () => void;

  currentSlot: number | null;
};

function minBig(a: bigint, b: bigint) {
  return a < b ? a : b;
}

function clampInt(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}


function formatSlots(slots: number) {
  return `${slots.toLocaleString()} slots`;
}

export function useBetModalState(args: UseBetModalStateArgs) {
  const {
    open,
    disabled = false,
    closeMs = 260,
    onCloseAction,
    onConfirmFieldsAction,
    onResetFieldsAction,
    currentSlot,
  } = args;

  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const lf = useAtomValue(liveFeedDecodedAtom);
  const epoch = useAtomValue(epochAtom);
  const tier = useAtomValue(selectedTierSettingsUiAtom);

  // ---- closing animation state ----
  const [isClosing, setIsClosing] = useState(false);
  useEffect(() => {
    if (open) setIsClosing(false);
  }, [open]);

  // ---- excluded number (secondary rollover) ----
  const excludedNumber = lf?.secondary_rollover_number ?? null;

  // ---- allowed numbers ----
  const allowedNumbers = useMemo<number[]>(() => {
    return excludedNumber == null
      ? [...NUMBERS]
      : NUMBERS.filter((n) => n !== excludedNumber);
  }, [excludedNumber]);

  // ---- local draft: number ----
  const [number, setNumber] = useState<number>(allowedNumbers[0] ?? 1);

  // When modal opens or allowedNumbers changes, ensure selection is valid.
  useEffect(() => {
    if (!open) return;
    if (!allowedNumbers.includes(number)) {
      setNumber(allowedNumbers[0] ?? 1);
    }
  }, [open, allowedNumbers, number]);

  // ---- countdown ----
  const remainingSlots = useMemo(() => {
    if (!epoch || currentSlot == null) return null;
    return Math.max(0, epoch.cutoffSlot - currentSlot);
  }, [epoch, currentSlot]);

  const bettingClosed = disabled || (remainingSlots != null && remainingSlots <= 0);

  const headerSubText = useMemo(() => {
    if (bettingClosed) return { kind: "closed" as const, text: "Betting closed" };
    if (remainingSlots == null) return { kind: "pending" as const, text: "—" };
    return { kind: "countdown" as const, text: `Betting ends in ${formatSlots(remainingSlots)}` };
  }, [bettingClosed, remainingSlots]);

  // ---- tier bounds (bigint lamports) ----
  const minLamports = tier?.minBet ?? null;
  const maxLamports = tier?.maxBet ?? null;

  // total number of discrete slider positions (0.01 step)
  const stepCount = useMemo(() => {
    if (minLamports == null || maxLamports == null) return 0;
    if (maxLamports < minLamports) return 0;
    return Number((maxLamports - minLamports) / STEP_LAMPORTS) + 1;
  }, [minLamports, maxLamports]);

  const maxIndex = useMemo(() => Math.max(0, stepCount - 1), [stepCount]);

  // ---- slider index state ----
  const [idx, setIdx] = useState<number>(0);

  // keep idx valid if tier changes
  useEffect(() => {
    if (!open) return;
    if (stepCount <= 0) {
      setIdx(0);
      return;
    }
    setIdx((p) => clampInt(p, 0, stepCount - 1));
  }, [open, stepCount]);

  const selectedLamports = useMemo(() => {
    if (minLamports == null || maxLamports == null || stepCount <= 0) return null;
    const stepped = minLamports + BigInt(idx) * STEP_LAMPORTS;
    return minBig(stepped, maxLamports);
  }, [idx, minLamports, maxLamports, stepCount]);

  const selectedSolText = useMemo(() => {
    return selectedLamports ? lamportsToSolTextTrim(selectedLamports) : "—";
  }, [selectedLamports]);

  const tierRangeText = useMemo(() => {
    if (minLamports == null || maxLamports == null) return "—";
    return `${lamportsToSolTextTrim(minLamports)} ~ ${lamportsToSolTextTrim(maxLamports)} SOL`;
  }, [minLamports, maxLamports]);

  // ---- wallet balance while modal open ----
  const [walletLamports, setWalletLamports] = useState<bigint | null>(null);

  useEffect(() => {
    if (!open) return;

    setWalletLamports(null);
    if (!publicKey) return;

    let cancelled = false;
    let subId: number | null = null;

    (async () => {
      try {
        const res = await connection.getBalanceAndContext(publicKey, "confirmed");
        if (!cancelled) setWalletLamports(BigInt(res.value));
      } catch {
        if (!cancelled) setWalletLamports(null);
      }
    })();

    try {
      subId = connection.onAccountChange(
        publicKey,
        (acc) => {
          if (!cancelled) setWalletLamports(BigInt(acc.lamports));
        },
        { commitment: "confirmed" }
      );
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
      if (subId != null) void connection.removeAccountChangeListener(subId);
    };
  }, [open, connection, publicKey]);

  const spendableLamports = useMemo(() => {
    if (walletLamports == null) return null;
    return walletLamports > FEE_BUFFER_LAMPORTS ? walletLamports - FEE_BUFFER_LAMPORTS : 0n;
  }, [walletLamports]);

  // for hinting only (NOT limiting the slider)
  const walletCappedMaxLamports = useMemo(() => {
    if (minLamports == null || maxLamports == null) return null;
    if (spendableLamports == null) return null;
    return roundDownToStep(minBig(maxLamports, spendableLamports), STEP_LAMPORTS);
  }, [minLamports, maxLamports, spendableLamports]);

  const insufficientFunds = useMemo(() => {
    if (!publicKey) return false;
    if (selectedLamports == null) return true;
    if (walletLamports == null) return false; // unknown, don’t scream yet
    const needed = selectedLamports + FEE_BUFFER_LAMPORTS;
    return walletLamports < needed;
  }, [publicKey, selectedLamports, walletLamports]);

  const needsLamports = useMemo(() => {
    if (selectedLamports == null) return null;
    return selectedLamports + FEE_BUFFER_LAMPORTS;
  }, [selectedLamports]);

  const confirmDisabled = useMemo(() => {
    return bettingClosed || stepCount <= 1 || isClosing || insufficientFunds;
  }, [bettingClosed, stepCount, isClosing, insufficientFunds]);

  const disabledReason = useMemo(() => {
    if (bettingClosed) return "Betting is closed";
    if (!epoch) return "Epoch info unavailable";
    if (!tier) return "Tier limits unavailable";
    if (stepCount <= 0) return "Your balance is below this tier’s minimum";
    if (selectedLamports == null) return "Choose an amount";
    if (walletLamports == null) return "Fetching wallet balance…";
    if (walletLamports <= 0n) return "Your wallet has no SOL";
    if (needsLamports == null) return "Choose an amount";
    if (walletLamports < needsLamports) return "Not enough SOL for this bet";
    return null;
  }, [bettingClosed, epoch, tier, stepCount, selectedLamports, walletLamports, needsLamports]);

  // ---- slider visuals ----
  const sliderPct = useMemo(() => {
    if (maxIndex <= 0) return "0%";
    const pct = (idx / maxIndex) * 100;
    return `${pct}%`;
  }, [idx, maxIndex]);

  const sliderWrapStyle = useMemo(
    () =>
      ({
        "--hue": String(HUE_BY_NUMBER[number] ?? 50),
        "--pct": sliderPct,
      }) as CSSProperties,
    [number, sliderPct]
  );

  const confirmStyle = useMemo(
    () =>
      ({
        "--hue": String(HUE_BY_NUMBER[number] ?? 50),
      }) as CSSProperties,
    [number]
  );

  // ---- actions ----
  const onMin = useCallback(() => setIdx(0), []);
  const onMax = useCallback(() => setIdx(maxIndex), [maxIndex]);

  const onCloseAndReset = useCallback(() => {
    onResetFieldsAction();
    onCloseAction();
  }, [onResetFieldsAction, onCloseAction]);

  const onConfirm = useCallback(() => {
    if (confirmDisabled) return;

    // start close animation
    setIsClosing(true);

    window.setTimeout(() => {
      // re-check safety gates
      if (bettingClosed) return;
      if (!publicKey) return;
      if (!epoch) return;
      if (!tier) return;
      if (selectedLamports == null) return;
      if (insufficientFunds) return;

      onConfirmFieldsAction({
        player: publicKey,
        tierId: tier.tierId,
        epoch: epoch.epoch,
        number,
        lamports: selectedLamports,
      });

      onCloseAction();
    }, closeMs);
  }, [
    confirmDisabled,
    bettingClosed,
    publicKey,
    epoch,
    tier,
    number,
    selectedLamports,
    insufficientFunds,
    onConfirmFieldsAction,
    onCloseAction,
    closeMs,
  ]);

  return {
    // raw dependencies (sometimes useful for UI decisions)
    lf,
    epoch,
    tier,
    publicKey,

    // open/close state
    isClosing,
    setIsClosing,

    // numbers
    excludedNumber,
    allowedNumbers,
    number,
    setNumber,

    // time
    remainingSlots,
    headerSubText,
    bettingClosed,

    // amount slider
    idx,
    setIdx,
    stepCount,
    maxIndex,
    selectedLamports,
    selectedSolText,
    tierRangeText,

    // wallet + funds
    walletLamports,
    walletCappedMaxLamports,
    insufficientFunds,

    // UI helpers
    confirmDisabled,
    disabledReason,
    sliderWrapStyle,
    confirmStyle,

    // actions
    onMin,
    onMax,
    onConfirm,
    onCloseAndReset,
  };
}