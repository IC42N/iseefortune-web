"use client";

import React, { useCallback, useEffect, useMemo, useState, CSSProperties } from 'react';
import { useAtomValue, useSetAtom } from "jotai";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./BetModal.module.scss";

import { liveFeedDecodedAtom } from "@/state/live-feed-atoms";
import { epochAtom } from "@/state/global-atoms";
import { selectedTierSettingsUiAtom } from "@/state/tier-atoms";

import {
  betModalAtom,
  betModalFieldsAtom,
  betModalModeAtom,
  resetBetModalAtom
} from '@/state/betting-atom';

import { HUE_BY_NUMBER } from '@/utils/colors';
import { lamportsToUsdText, roundDownToStep, STEP_LAMPORTS } from '@/utils/betting';
import { useCurrentSlot } from "@/solana/hooks/use-current-slot";
import {
  getConfirmTextForMode,
  getTitleForMode
} from '@/components/BetModal/utils';
import { configReadyAtom } from "@/state/config-atoms";
import ModalHeader from "@/components/BetModal/Parts/ModalHeader";
import NumberPicker from "@/components/BetModal/Parts/NumberPicker";
import AmountPicker from "@/components/BetModal/Parts/AmountPicker";
import { springFast } from "@/app/animations/animations";
import { useSolUsdSnapshot } from "@/solana/hooks/use-sol-usd-snapshot";
import BetSummary from "@/components/BetModal/Parts/BetSummary";
import { estimatePayout } from "@/utils/est-payout";
import { submitBetModalTx } from '@/solana/tx/betting/submit-bet-modal';
import { useAnchorProvider, useProgram } from '@/solana/anchor-client';
import LockedNumber from '@/components/BetModal/Parts/LockedNumber';
import { usePhaseToast } from "@/components/ui/Toast/use-toast";
import { toErrMsg } from '@/utils/error';
import { buildBetSummaryVm } from '@/utils/bet-summary-vm';
import { afterBetAuth } from '@/components/BetModal/AuthticateChat';
import { SendTxResult } from '@/solana/tx/send-transaction';
import Clouds from '@/components/ui/Clouds/Clouds';
import { minPicksForBetType } from '@/components/BetModal/number_helper';
import { SelectedNumbers } from '@/components/ui/SelectedNumbers/SelectedNumbers';
import { lamportsToSolTextTrim } from '@/utils/solana_helper';
import { clampInt, minBig } from '@/utils/number_helper';


const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// Keep a tiny buffer so “max” doesn’t brick on fees/rent/etc.
const FEE_BUFFER_LAMPORTS = 50_000n;


export default function BetModal() {
  // ===========================================================================
  // Solana + Wallet
  // ===========================================================================
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // ===========================================================================
  // Global app state (atoms)
  // ===========================================================================
  const lf = useAtomValue(liveFeedDecodedAtom);
  const epoch = useAtomValue(epochAtom);
  const tier = useAtomValue(selectedTierSettingsUiAtom);
  const config = useAtomValue(configReadyAtom);

  // Modal state (mode + fields live in atoms)
  const modal = useAtomValue(betModalAtom);
  const mode = useAtomValue(betModalModeAtom);
  const fields = useAtomValue(betModalFieldsAtom);

  // Setters for patching fields + closing the modal
  const patchFields = useSetAtom(betModalFieldsAtom);
  const closeModal = useSetAtom(resetBetModalAtom);

  // Set up send provider
  const provider = useAnchorProvider();
  const program = useProgram();

  // ===========================================================================
  // Animation state
  // ===========================================================================
  const [numberPickProcessing, setNumberPickProcessing] = useState(false);
  const [numberPickReady, setNumberPickReady] = useState(false);
  const [amountEverOpened, setAmountEverOpened] = useState(false);

  // ===========================================================================
  // Wallet balance (live while modal open)
  // ===========================================================================
  const [walletLamports, setWalletLamports] = useState<bigint | null>(null);


  // ===========================================================================
  // Submission state
  // ===========================================================================
  type TxPhase = "idle" | "signing" | "sending" | "success" | "error";
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");

  // ===========================================================================
  // Modal open/close lifecycle
  // ===========================================================================
  const open = modal !== null;
  const [isClosing, setIsClosing] = useState(false);

  // ===========================================================================
  // Use Toast Notifications
  // ===========================================================================
  const { toastReplace, toastClear } = usePhaseToast();


  // Reset closing flag when opened
  useEffect(() => {
    if (!open) {
      // local-only cleanup is fine here (atoms reset via closeModal)
      setAmountEverOpened(false);
      setNumberPickProcessing(false);
      setNumberPickReady(false);
      setIdx(0);
      setTxPhase("idle");
      return;
    }

    setIsClosing(false);
    setAmountEverOpened(true);
    setIdx(0);

    if (mode === "new") {
      // Fresh start every time
      patchFields({
        betType: 0,          // or whatever your default is
        numbers: [],
        lamportsPerNumber: 0n,
      });
      return;
    }

    // Edit modes MUST come from snapshot, not fields.
    const snap = modal?.original;
    if (!snap) return;

    patchFields({
      betType: snap.betType,
      numbers: [...snap.numbers],
      lamportsPerNumber: snap.lamportsPerNumber,
    });
  }, [open, mode, patchFields, modal?.original]);

  // ===========================================================================
  // Price snapshot (SOL → USD) while open
  // ===========================================================================
  // Used only for display; should not gate confirm (UX stays fast even if price is slow).
  const { usd: solUsd, loading: solUsdLoading } = useSolUsdSnapshot(open);

  // ===========================================================================
  // Allowed numbers (exclude rollover numbers from betting)
  // ===========================================================================
  const excludedSecondary = lf?.secondary_rollover_number ?? null;
  const excludedPrimary = config?.primaryRollOverNumber ?? null;

  const allowedNumbers = useMemo<number[]>(() => {
    return NUMBERS.filter((n) => {
      if (excludedSecondary != null && n === excludedSecondary) return false;
      return !(excludedPrimary != null && n === excludedPrimary);
    }) as number[];
  }, [excludedSecondary, excludedPrimary]);

  // ===========================================================================
  // Mode rules (what is editable depending on modal mode)
  // ===========================================================================
  const lockNumber = mode === "addLamports";
  const lockAmount = mode === "changeNumber";


  // ===========================================================================
  /** Change-number constraints (derived from snapshot) */
  // ===========================================================================
  const originalSnap = modal?.original ?? null;
  const lockedPickCount =
    mode === "changeNumber" ? (originalSnap?.numbers?.length ?? null) : null;

  // Split toggle should be locked in changeNumber mode.
  // (Player can still change picks, but cannot switch single <-> multi)
  const lockBetType = mode === "changeNumber";


  // ===========================================================================
  // Current selected number (from atom-backed fields)
  // ===========================================================================
  const numbers = fields?.numbers;
  const pickCount = fields?.numbers?.length ?? 0;
  const k = Math.max(1, pickCount);
  const kBig = BigInt(k);
  const originalPerNumber = modal?.original?.lamportsPerNumber ?? 0n;

  // ===========================================================================
  // UI visibility rules (step-by-step flow for "new" bets)
  // ===========================================================================
  const isNew = mode === "new";
  const isAdd = mode === "addLamports";
  const hasPickedNumber = (numbers?.length ?? 0) > 0;


  // Testing. Delete afterwards
  useEffect(() => {
    if (!open || !fields) return;
    console.groupCollapsed("🧠 BetModal fields updated");
    console.log("mode:", mode);
    console.log("betType:", fields.betType);
    console.log("numbers:", fields.numbers);
    console.log("lamportsPerNumber:", String(fields.lamportsPerNumber ?? "undefined"));
    console.groupEnd();
  }, [open, mode, fields]);


  // reset whenever modal opens / mode changes
  useEffect(() => {
    if (!open || !fields) return;

    // Always clear processing when (re)opening or changing mode
    setNumberPickProcessing(false);

    // Default: block amount until we explicitly allow it
    setNumberPickReady(false);

    // Non-new modes: amount should be allowed immediately
    if (mode !== "new") {
      setNumberPickReady(true);
      return;
    }

    // numbers selected
    const betType = fields.betType;
    const min = minPicksForBetType(betType);
    setNumberPickReady(pickCount >= min);
  }, [open, mode, fields, pickCount]);



  // Amount is hidden in "new" until a number is chosen (avoids early calc + confusion)
  const showAmount =
    mode !== "changeNumber" &&
    (!isNew ? true : (hasPickedNumber && numberPickReady));

  // Summary shows once the amount stage is visible, OR always in changeNumber (amount locked)
  const showSummary = showAmount || mode === "changeNumber" || mode === "addLamports";

  // ===========================================================================
  // Safety: if currently selected number becomes excluded, snap to first allowed
  // (only when number is editable)
  // ===========================================================================
  useEffect(() => {
    if (!open) return;
    if (!fields) return;

    // In addLamports, picks must not change
    if (mode === "addLamports") return;

    // changeNumber: never auto-modify the user's existing picks
    if (mode === "changeNumber") return;

    const picks = fields.numbers ?? [];
    if (picks.length === 0) return;

    let next = picks.filter((n) => allowedNumbers.includes(n));
    if (next.length === picks.length) return;

    next = Array.from(new Set(next));

    const min = minPicksForBetType(fields.betType);
    if (next.length < min) {
      for (const n of allowedNumbers) {
        if (next.length >= min) break;
        if (!next.includes(n)) next.push(n);
      }
    }

    // 4) final fallback if allowedNumbers is empty or something weird happens
    if (next.length === 0) {
      next = [allowedNumbers[0] ?? 1];
    }

    patchFields({ numbers: next });
  }, [open, lockNumber, allowedNumbers, patchFields, fields, mode]);


  // ===========================================================================
  // Countdown / betting closed logic (based on cutoffSlot - currentSlot)
  // ===========================================================================
  const currentSlot = useCurrentSlot({ commitment: "confirmed", pollMs: 1200 });

  const remainingSlots = useMemo(() => {
    if (!epoch || currentSlot == null) return null;
    return Math.max(0, epoch.cutoffSlot - currentSlot);
  }, [epoch, currentSlot]);

  const bettingClosed = remainingSlots != null && remainingSlots <= 0;

  // ===========================================================================
  // Tier bounds (lamports) + slider step math
  // ===========================================================================
  const minLamports = tier?.minBet ?? null;
  const maxLamports = tier?.maxBet ?? null;
  const originalPerNumberLamports = originalPerNumber;

  const spendableLamports = useMemo(() => {
    if (walletLamports == null) return null;
    return walletLamports > FEE_BUFFER_LAMPORTS ? walletLamports - FEE_BUFFER_LAMPORTS : 0n;
  }, [walletLamports]);

  const sliderMinLamports = 0n;

  // Slider max = max delta PER NUMBER
  const sliderMaxLamports = useMemo(() => {
    if (maxLamports == null) return null;

    // Tier max is PER-NUMBER
    const tierRemainingPer =
      mode === "addLamports"
        ? (maxLamports > originalPerNumberLamports ? (maxLamports - originalPerNumberLamports) : 0n)
        : maxLamports; // new: base is 0

    // Wallet cap: must afford (deltaPer * k)
    const spendable = spendableLamports ?? 0n;
    const walletCapPerDelta = kBig > 0n ? (spendable / kBig) : 0n;

    const rawMaxPerDelta = minBig(tierRemainingPer, walletCapPerDelta);
    return roundDownToStep(rawMaxPerDelta, STEP_LAMPORTS);
  }, [maxLamports, mode, originalPerNumberLamports, spendableLamports, kBig]);



  // Total number of discrete slider positions (based on STEP_LAMPORTS)
  const stepCount = useMemo(() => {
    if (sliderMinLamports == null || sliderMaxLamports == null) return 0;
    if (sliderMaxLamports < sliderMinLamports) return 0;
    return Number((sliderMaxLamports - sliderMinLamports) / STEP_LAMPORTS) + 1;
  }, [sliderMinLamports, sliderMaxLamports]);

  const maxIndex = useMemo(() => Math.max(0, stepCount - 1), [stepCount]);

  // ===========================================================================
  // Slider state + initialization from atom fields
  // ===========================================================================
  const [idx, setIdx] = useState<number>(0);


  // Keep idx valid if tier changes while open
  useEffect(() => {
    if (!open) return;
    if (stepCount <= 0) {
      setIdx(0);
      return;
    }
    setIdx((p) => clampInt(p, 0, maxIndex));
  }, [open, stepCount, maxIndex]);


  const onIdxChange = useCallback((nextIdx: number) => {
    setIdx(nextIdx);
    if (lockAmount) return;
    if (sliderMaxLamports == null || stepCount <= 0) return;

    const deltaPer = minBig(BigInt(nextIdx) * STEP_LAMPORTS, sliderMaxLamports);

    const nextPer =
      mode === "addLamports"
        ? originalPerNumberLamports + deltaPer
        : deltaPer;

    patchFields({ lamportsPerNumber: nextPer });
  }, [lockAmount, sliderMaxLamports, stepCount, patchFields, mode, originalPerNumberLamports]);


  // ===========================================================================
  // Amount derivation: idx -> deltaPer -> effectivePer -> effectiveTotal
  // ===========================================================================
  const deltaPerNumberLamports = useMemo(() => {
    if (sliderMaxLamports == null || stepCount <= 0) return 0n;
    const stepped = BigInt(idx) * STEP_LAMPORTS;
    return minBig(stepped, sliderMaxLamports);
  }, [idx, sliderMaxLamports, stepCount]);

  const effectivePerNumberLamports = useMemo(() => {
    if (lockAmount) return originalPerNumberLamports; // changeNumber locked

    if (mode === "addLamports") {
      return originalPerNumberLamports + deltaPerNumberLamports;
    }

    // new
    return deltaPerNumberLamports;
  }, [lockAmount, mode, originalPerNumberLamports, deltaPerNumberLamports]);


  useEffect(() => {
    if (!open || !fields) return;
    if (lockAmount) return; // changeNumber locked

    if (sliderMaxLamports == null || stepCount <= 0) return;

    const deltaPer = minBig(BigInt(idx) * STEP_LAMPORTS, sliderMaxLamports);
    const nextPer =
      mode === "addLamports"
        ? (originalPerNumberLamports + deltaPer)
        : deltaPer;

    if (fields.lamportsPerNumber !== nextPer) {
      patchFields({ lamportsPerNumber: nextPer });
    }
  }, [
    open,
    fields,
    idx,
    lockAmount,
    sliderMaxLamports,
    stepCount,
    mode,
    originalPerNumberLamports,
    patchFields,
  ]);



  const effectiveTotalLamports = useMemo(() => {
    return effectivePerNumberLamports * kBig;
  }, [effectivePerNumberLamports, kBig]);

// addLamports breakdown (TOTALS)
  const originalTotalLamports = useMemo(() => {
    return mode === "addLamports" ? (originalPerNumberLamports * kBig) : 0n;
  }, [mode, originalPerNumberLamports, kBig]);

  const addedTotalLamports = useMemo(() => {
    return mode === "addLamports" ? (deltaPerNumberLamports * kBig) : 0n;
  }, [mode, deltaPerNumberLamports, kBig]);

  const newTotalLamports = useMemo(() => {
    if (mode !== "addLamports") return 0n;
    return originalTotalLamports + addedTotalLamports;
  }, [mode, originalTotalLamports, addedTotalLamports]);

// Wallet impact
  const payLamports = useMemo(() => {
    if (mode === "changeNumber") return 0n;
    if (mode === "addLamports") return deltaPerNumberLamports * kBig;
    return effectivePerNumberLamports * kBig; // new
  }, [mode, deltaPerNumberLamports, effectivePerNumberLamports, kBig]);



  // ===========================================================================
  // Display-only USD text for selected SOL amount
  // ===========================================================================
  // show per-number in the selector
  const usdLamportsForDisplay =
    mode === "addLamports" ? deltaPerNumberLamports : effectivePerNumberLamports;

  const selectedUsdText = useMemo(() => {
    if (!solUsd) return "";
    if (!usdLamportsForDisplay || usdLamportsForDisplay <= 0n) return "";

    const sol = Number(usdLamportsForDisplay) / 1e9;
    const usd = sol * solUsd;

    return usd.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  }, [solUsd, usdLamportsForDisplay]);


  // ===========================================================================
  // Display-only USD strings for summary
  // ===========================================================================
  const originalSolText = useMemo(() => {
    if (mode !== "addLamports") return "";
    if (originalTotalLamports <= 0n) return "";
    return lamportsToSolTextTrim(originalTotalLamports);
  }, [mode, originalTotalLamports]);

  const addedSolText = useMemo(() => {
    if (mode !== "addLamports") return "";
    if (addedTotalLamports <= 0n) return "";
    return lamportsToSolTextTrim(addedTotalLamports);
  }, [mode, addedTotalLamports]);

  const totalSolTextForSummary = useMemo(() => {
    if (mode !== "addLamports") return "";
    if (newTotalLamports <= 0n) return "";
    return lamportsToSolTextTrim(newTotalLamports);
  }, [mode, newTotalLamports]);

  const totalUsdText = useMemo(
    () => lamportsToUsdText(mode === "addLamports" ? newTotalLamports : effectiveTotalLamports, solUsd),
    [mode, newTotalLamports, effectiveTotalLamports, solUsd]
  );

  const originalUsdText = useMemo(
    () => lamportsToUsdText(originalTotalLamports, solUsd),
    [originalTotalLamports, solUsd]
  );

  const addedUsdText = useMemo(
    () => lamportsToUsdText(addedTotalLamports, solUsd),
    [addedTotalLamports, solUsd]
  );



  // Selection text
  const selectionText = useMemo(() => {
    const nums = fields?.numbers ?? [];
    if (nums.length === 0) return "—";
    return nums.length === 1 ? String(nums[0]) : nums.join(", ");
  }, [fields?.numbers]);


  useEffect(() => {
    if (!open) return;
    if (!lockAmount) return;

    // changeNumber: amount is irrelevant, keep delta clean
    patchFields({ lamportsPerNumber: originalPerNumberLamports });
    setIdx(0);
  }, [open, lockAmount, patchFields, originalPerNumberLamports]);


  useEffect(() => {
    if (!open) return;
    setWalletLamports(null);
    if (!publicKey) return;

    let cancelled = false;
    let subId: number | null = null;

    // Initial fetch
    (async () => {
      try {
        const res = await connection.getBalanceAndContext(publicKey, "confirmed");
        if (!cancelled) setWalletLamports(BigInt(res.value));
      } catch {
        if (!cancelled) setWalletLamports(null);
      }
    })();

    // Live subscription
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

  // ===========================================================================
  // Funds checks + wallet capped max (prevents "max" from exceeding spendable)
  // ===========================================================================

  const walletCappedMaxLamports = useMemo(() => {
    if (sliderMaxLamports == null) return null;
    // sliderMaxLamports is already tier+wallet capped PER NUMBER
    return sliderMaxLamports;
  }, [sliderMaxLamports]);


  const insufficientFunds = useMemo(() => {
    if (!publicKey) return false;
    if (walletLamports == null) return false;
    const needed = payLamports + FEE_BUFFER_LAMPORTS;
    return walletLamports < needed;
  }, [publicKey, walletLamports, payLamports]);

  // ===========================================================================
  // Text helpers (tier range, wallet display)
  // ===========================================================================
  const tierRangeText = useMemo(() => {
    if (minLamports == null || maxLamports == null) return "—";
    return `${lamportsToSolTextTrim(minLamports)} ~ ${lamportsToSolTextTrim(maxLamports)}`;
  }, [minLamports, maxLamports]);

  const walletCappedMaxSolText =
    publicKey && walletCappedMaxLamports != null
      ? lamportsToSolTextTrim(walletCappedMaxLamports)
      : null;

  const walletBalanceSolText =
    publicKey && walletLamports != null ? lamportsToSolTextTrim(walletLamports) : null;

  // Slider button handlers
  const onMax = useCallback(() => onIdxChange(maxIndex), [onIdxChange, maxIndex]);
  const onMin = useCallback(() => onIdxChange(0), [onIdxChange]);

  // ===========================================================================
  // Confirm enable/disable rules (central gating logic)
  // ===========================================================================
  const numberValid = useMemo(() => {
    if (mode === "new") return hasPickedNumber;

    if (mode === "changeNumber") {
      // Must end with EXACT same count as original.
      if (lockedPickCount == null) return false;
      return pickCount === lockedPickCount;
    }

    // addLamports (numbers locked anyway)
    return true;
  }, [mode, hasPickedNumber, lockedPickCount, pickCount]);

  const isNoopAdd = isAdd && deltaPerNumberLamports <= 0n;
  const isNoopNew = isNew && effectivePerNumberLamports <= 0n; // or deltaPerNumberLamports
  const addAtCap = isAdd && sliderMaxLamports != null && sliderMaxLamports <= 0n;


  const confirmDisabled =
    isNoopNew ||
    isNoopAdd ||
    !numberValid ||
    !fields ||
    bettingClosed ||
    stepCount <= 0 ||
    isClosing ||
    addAtCap ||
    insufficientFunds ||

    (lockAmount && modal?.original == null);

  const hideSummary =
    !numberValid ||
    !fields ||
    bettingClosed ||
    stepCount <= 0 ||
    isClosing ||
    addAtCap ||
    insufficientFunds ||
    (lockAmount && modal?.original == null);


  // Necessary lamports includes a small buffer
  const needsLamports = useMemo(() => {
    return payLamports + FEE_BUFFER_LAMPORTS;
  }, [payLamports]);

  // Tooltip / button messaging
  const disabledReason = useMemo(() => {
    if (mode === "changeNumber" && lockedPickCount != null && pickCount !== lockedPickCount) {
      return `Select exactly ${lockedPickCount} numbers`;
    }
    if (bettingClosed) return "Betting is closed";
    if (addAtCap) return "Already at tier max";
    if (isNoopNew) return "Choose your conviction amount";
    if (isNoopAdd) return "Choose how much to add";
    if (!epoch) return "Epoch info unavailable";
    if (!tier) return "Tier limits unavailable";
    if (stepCount <= 0) return "Tier range unavailable";
    if (walletLamports == null) return "Fetching wallet balance…";
    if (walletLamports <= 0n) return "Your wallet has no SOL";
    if (walletLamports < needsLamports) return "Not enough SOL for this bet";
    return null;
  }, [mode, lockedPickCount, pickCount, bettingClosed, addAtCap, isNoopNew, isNoopAdd, epoch, tier, stepCount, walletLamports, needsLamports]);

  const isBusy = txPhase === "signing" || txPhase === "sending";



  // ===========================================================================
  // Visual styling (hue by number + slider fill %)
  // ===========================================================================
  const confirmHue = numbers != undefined && numbers.length > 0
      ? HUE_BY_NUMBER[numbers[0]] ?? 50
      : 50;

  const confirmStyle = useMemo(
    () => ({ "--hue": String(confirmHue) }) as CSSProperties,
    [confirmHue]
  );

  const sliderPct = useMemo(() => {
    if (maxIndex <= 0) return "0%";
    const pct = (idx / maxIndex) * 100;
    return `${pct}%`;
  }, [idx, maxIndex]);

  const sliderWrapStyle = useMemo(
    () =>
      ({
        "--hue": String(confirmHue),
        "--pct": sliderPct,
      }) as CSSProperties,
    [confirmHue, sliderPct]
  );

  // ===========================================================================
  // Summary computations (only when summary is shown)
  // ===========================================================================
  const payoutInfo = useMemo(() => {
    if (!showSummary || !fields || !lf) return null;

    if (fields.betType !== 0) return null;
    const pick = fields.numbers[0];
    if (pick == null) return null;

    const totalPotLamports = lf.total_lamports ?? null;
    const numberPoolLamports = lf.lamports_per_number[pick] ?? null;
    if (totalPotLamports == null || numberPoolLamports == null) return null;

    if (effectivePerNumberLamports <= 0n) return null;

    return estimatePayout({
      betLamports: effectivePerNumberLamports,
      numberPoolLamports: BigInt(numberPoolLamports),
      totalPotLamports: BigInt(totalPotLamports),
      includeSelfInPools: true,
      feeBps: 0,
    });
  }, [showSummary, lf, fields, effectivePerNumberLamports]);


  const usdInfo = useMemo(() => {
    if (!showSummary) return null;
    if (solUsd == null) return null;

    const betSol = Number(effectiveTotalLamports) / 1e9;
    const betUsdText = `$${(betSol * solUsd).toFixed(2)}`;

    return { solUsd, betUsdText };
  }, [showSummary, solUsd, effectiveTotalLamports]);


  // View-model for BetSummary (keeps the render clean)
// View-model for BetSummary (keeps the render clean)
  const betSummaryVm = useMemo(() => {
    const betType = fields?.betType ?? 0;
    const numbers = fields?.numbers ?? [];
    const perPickLamports = effectivePerNumberLamports;

    // Only show single-number insight metrics (too noisy for multi-pick)
    const isSingle = betType === 0 && numbers.length === 1;
    const pick = isSingle ? numbers[0] : null;

    return buildBetSummaryVm({
      show: showSummary,

      betType,
      numbers,

      payoutInfo: isSingle ? payoutInfo : null,
      usdInfo,

      // insight section (single-only)
      playersOnNumber:
        pick != null ? (Number(lf?.bets_per_number?.[pick]) ?? null) : null,

      // total stake + per-pick stake
      betLamports: effectiveTotalLamports,
      perPickLamports,

      minLamports: tier?.minBet ?? null,
      maxLamports: tier?.maxBet ?? null,
      isBettingClosed: bettingClosed,
    });
  }, [fields?.betType, fields?.numbers, effectivePerNumberLamports, showSummary, payoutInfo, usdInfo, lf?.bets_per_number, effectiveTotalLamports, tier?.minBet, tier?.maxBet, bettingClosed]);


  // ===========================================================================
  // Confirm + Close handlers
  // ===========================================================================
  const onConfirm = useCallback(async () => {

    if(tier == null || tier.tierId == null) return;
    if (confirmDisabled) return;
    if (!provider) return;
    if (!program) return;

    const verb =
      mode === "new" ? "Prediction placed" :
        mode === "addLamports" ? "Stake Increased" :
          "Prediction updated";


    setTxPhase("signing");
    toastReplace({
      title: "Confirm in wallet",
      description: "Approve the transaction to continue.",
      type: "info"
    });

    try {
      const result: SendTxResult = await submitBetModalTx({
        program,
        provider,
        state: modal!,
        allowedNumbers,
        onAfterSignAction: () => setTxPhase("sending"),
      });

      if (!result.ok) {
        setTxPhase("idle");
        setIsClosing(false);

        if (result.reason === "USER_REJECTED") {
          toastReplace({
            title: "Transaction cancelled",
            description: "You cancelled the wallet prompt.",
            type: "info",
          });
          return;
        }

        // FAILED
        toastReplace({
          title: "Transaction failed",
          description: result.message,
          type: "error",
        });
        return;
      }

      // Signature exists from here
      const { signature } = result;
      toastReplace({
        title: verb,
        description: `${signature.slice(0, 8)}...${signature.slice(-8)}`,
        type: "success",
      });

      setTxPhase("success");
      setIsClosing(false);            // let user close manually OR auto-close later if you want

      // Fire-and-forget, but handle errors internally
      void afterBetAuth({ txSig: signature, tier: tier.tierId })
        .catch((err) => {
          console.error("afterBetAuth failed:", err);
          // optional: show a softer toast that doesn't imply their bet failed
          toastReplace({
            title: "Synced in background",
            description: "Your bet is set. Sync is taking longer than usual.",
            type: "info",
          });
        });

    } catch (e) {
      // unexpected bug only
      setTxPhase("idle");
      setIsClosing(false);
      console.error(e);
      toastReplace({ title: "Unexpected error", description: toErrMsg(e), type: "error" });
    }
  }, [tier, confirmDisabled, provider, program, mode, toastReplace, modal, allowedNumbers]);

  const onClose = useCallback(() => {
    if (isClosing) return;
    closeModal();
  }, [isClosing, closeModal]);

  // ===========================================================================
  // Header strings
  // ===========================================================================
  const title = getTitleForMode(mode);
  const confirmText = getConfirmTextForMode(mode);

  // If the modal isn't open (or fields not initialized), render nothing.
  if (!open || !fields) return null;


  // ===========================================================================
  // Submission
  // ===========================================================================
  const isProcessing = txPhase !== "idle";
  const btnDisabled = confirmDisabled || isProcessing;

  const btnText =
    confirmDisabled ? (disabledReason ?? confirmText) :
      txPhase === "signing" ? "Confirm in wallet" :
        txPhase === "sending" ? "Submitting Transaction" :
          confirmText;

  const deltaSolText = lamportsToSolTextTrim(addedTotalLamports); // total delta (k * deltaPer)
  const totalSolText = lamportsToSolTextTrim(mode === "addLamports" ? newTotalLamports : effectiveTotalLamports);



  // ===========================================================================
  // Success message
  // ===========================================================================
  function getSuccessCopy(
    mode: "new" | "addLamports" | "changeNumber",
    selectionText: string
  ) {
    switch (mode) {
      case "new":
        return {
          title: "Prediction set",
          body: (
            <>
              Your prediction is now set. You can increase your conviction amount before cutoff.
              <br />
              Change tickets can be used to switch your prediction number.
            </>
          ),
        };

      case "addLamports":
        return {
          title: "Conviction increased",
          body: (
            <>
              Your conviction has increased {deltaSolText} for a total of {totalSolText} SOL.
              <br />
              You can increase again anytime before cutoff.
            </>
          ),
        };

      case "changeNumber":
        return {
          title: "Prediction updated",
          body: (
            <>
              Your prediction has been changed to <strong>{selectionText}</strong> successfully.
              <br />
              You can still increase your conviction amount before cutoff.
            </>
          ),
        };
    }
  }

  const copy = getSuccessCopy(mode ?? "new", selectionText);


  const perNumberSolText = lamportsToSolTextTrim(effectivePerNumberLamports);
  const deltaPerNumberSolText = lamportsToSolTextTrim(deltaPerNumberLamports);
  // ===========================================================================
  // Render
  // ===========================================================================
  return (
    <div
      className={`${styles.modalOverlay} ${isClosing ? styles.overlayClosing : ""}`}
      onClick={(e) => {
        if (isClosing) return;
        if (e.target === e.currentTarget) {
          closeModal();
          setTxPhase("idle");
          toastClear();
        }
      }}
    >
      <div className={`${styles.modal} ${isClosing ? styles.modalClosing : ""}`}>
        <div className={styles.modalInner}>

          {/* SUCCESS PANE (mounted always, only visible when success) */}
          <div
            className={`${styles.successPane} ${
              txPhase === "success" ? styles.successIn : styles.successHidden
            }`}
            role="status"
            aria-live="polite"
          >
            <Clouds />
            <div className={styles.successCard}>
              {/* MULTI-NUMBER SUCCESS ICONS */}
              <SelectedNumbers numbers={fields.numbers} />

              <div className={styles.successText}>
                <div className={styles.successTitle}>{copy.title}</div>
                <div className={styles.successSub}>{copy.body}</div>
              </div>

              <button
                type="button"
                className={styles.successCloseBtn}
                onClick={() => {
                  closeModal();
                  setTxPhase("idle");
                  toastClear();
                }}
              >
                Close
              </button>
            </div>
          </div>


            {/* FORM PANE (mounted always, fades out when success) */}
            <div className={`${styles.formPane} ${txPhase === "success" ? styles.formOut : ""}`}>
              {/* ===============================================================
                Header (title + countdown + close)
                =============================================================== */}
              <ModalHeader
                title={title}
                bettingClosed={bettingClosed}
                remainingSlots={remainingSlots}
                onCloseAction={onClose}
              />

              <div className={styles.modalBody}>
                {/* ===============================================================
                  Step 1: Number selection (or locked display)
                  =============================================================== */}
                {lockNumber && numbers && numbers.length > 0 ? (
                  <LockedNumber numbers={numbers ?? []} />
                ) : (
                  <NumberPicker
                    mode={mode}
                    allowedNumbers={allowedNumbers}
                    betType={fields.betType}
                    selectedNumbers={fields?.numbers ?? []}
                    onChangeAction={({ betType, numbers }) => {
                      if (bettingClosed || isClosing) return;

                      // Apply the selection change
                      patchFields({ betType, numbers });

                      // Optional: keep your 240ms “Selecting…” micro-animation
                      if (mode === "new" && !amountEverOpened) {
                        setNumberPickProcessing(true);
                        window.setTimeout(() => {
                          setNumberPickProcessing(false);
                        }, 240);
                      } else {
                        setNumberPickProcessing(false);
                      }

                      // IMPORTANT: do NOT setNumberPickReady() here.
                      // Let your existing useEffect derive readiness from betType + numbers.length.
                    }}
                    bettingClosed={bettingClosed}
                    isClosing={isClosing}
                    lockNumber={mode === "addLamports"}
                    isProcessing={numberPickProcessing}
                    lockBetType={lockBetType}
                    lockPickCount={lockedPickCount}
                  />


                )}

                {/* ===============================================================
                  Step 2: Amount selection (animated)
                  - hidden for "new" until number is chosen
                  - locked in changeNumber mode
                  =============================================================== */}
                <AnimatePresence initial={false}>
                  {showAmount && (
                    <motion.div
                      key="amount"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={springFast}
                    >
                      <AmountPicker
                        selectedSolText={isAdd ? deltaPerNumberSolText : perNumberSolText}
                        selectedUsdText={solUsdLoading ? "Fetching Price" : selectedUsdText ?? "—"}
                        tierRangeText={tierRangeText}
                        idx={idx}
                        maxIndex={maxIndex}
                        stepCount={stepCount}
                        sliderWrapStyle={sliderWrapStyle}
                        publicKeyPresent={!!publicKey}
                        walletCappedMaxSolText={walletCappedMaxSolText}
                        walletBalanceSolText={walletBalanceSolText}
                        insufficientFunds={insufficientFunds}
                        bettingClosed={bettingClosed}
                        lockAmount={lockAmount}
                        onMinAction={onMin}
                        onMaxAction={onMax}
                        onIdxChangeAction={onIdxChange}
                        variant={mode ?? "new"}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ===============================================================
                Footer: Summary + Confirm
                - shown once we’re at amount stage, or always in changeNumber mode
                =============================================================== */}
              {showSummary && !hideSummary && (
                <div className={[
                  styles.modalFooter,
                  styles[`modalFooter--${mode}`],
                ].join(" ")}>

                  {/*<AnimatePresence mode="popLayout" initial={false}>*/}
                  {/*  {debouncedSplitWarning && (*/}
                  {/*    <motion.div*/}
                  {/*      key="split-warning"*/}
                  {/*      className={styles.warningBox}*/}
                  {/*      initial={{ opacity: 0, height: 0, scale: 0.90, filter: "blur(8px)" }}*/}
                  {/*      animate={{ opacity: 1, height: "auto", scale: 1, filter: "blur(0px)" }}*/}
                  {/*      exit={{ opacity: 0, height: 0, scale: 0.90, filter: "blur(8px)" }}*/}
                  {/*      transition={{*/}
                  {/*        type: "spring",*/}
                  {/*        stiffness: 900,*/}
                  {/*        damping: 64,*/}
                  {/*        mass: 0.6,*/}
                  {/*      }}*/}
                  {/*      layout*/}
                  {/*    >*/}
                  {/*      <div className={styles.warningTitle}>Split may be slightly uneven</div>*/}
                  {/*      <div className={styles.warningBody}>*/}
                  {/*        You selected {pickCount} numbers. Your total is split across your selections, so the per-number amount may be off by up to{" "}*/}
                  {/*        {remainder.toString()} lamport{remainder === 1n ? "" : "s"}.*/}
                  {/*        <br />*/}
                  {/*        This is allowed — just a heads up if you’re aiming for an exact per-number contribution.*/}
                  {/*      </div>*/}
                  {/*    </motion.div>*/}
                  {/*  )}*/}
                  {/*</AnimatePresence>*/}

                  <BetSummary
                    variant={mode ?? "new"}

                    betType={fields.betType}
                    numbers={fields?.numbers ?? []}

                    selectedSolText={betSummaryVm?.selectedSolText ?? ""}
                    perPickSolText={betSummaryVm?.perPickSolText ?? null}
                    usdText={betSummaryVm?.usdText ?? null}

                    // insight (single-only; VM already nulls these for multi-pick)
                    sharePctText={betSummaryVm?.sharePctText}
                    numberPoolSolText={betSummaryVm?.numberPoolSolText}
                    estPayoutSolText={betSummaryVm?.estPayoutSolText}
                    estPayoutUsdText={betSummaryVm?.estPayoutUsdText}
                    playerCountText={betSummaryVm?.playerCountText}

                    // addLamports breakdown
                    originalSolText={originalSolText}
                    addedSolText={addedSolText}
                    totalSolText={totalSolTextForSummary}

                    originalUsdText={originalUsdText}
                    addedUsdText={addedUsdText}
                    totalUsdText={totalUsdText}

                    selectedLamports={effectiveTotalLamports}
                    originalLamports={originalTotalLamports}
                    addedLamports={addedTotalLamports}
                    totalLamports={mode === "addLamports" ? newTotalLamports : effectiveTotalLamports}
                    quip={betSummaryVm?.quip}
                  />


                  <button
                    style={confirmStyle}
                    className={`
                    ${styles.primaryBtn}
                    ${isBusy ? styles.processing : ""}
                    ${btnDisabled ? styles.primaryBtnDisabled : styles.primaryBtnActive}
                  `}
                    disabled={btnDisabled || isBusy}
                    aria-busy={isBusy}
                    title={btnDisabled ? (disabledReason ?? undefined) : undefined}
                    onClick={onConfirm}
                    type="button"
                  >
                    {isBusy ? (
                      <span className={styles.btnProgressText}>{btnText}</span>
                    ) : (
                      btnText
                    )}
                  </button>
                </div>
              )}
            </div>

        </div>
      </div>
    </div>
  );
}