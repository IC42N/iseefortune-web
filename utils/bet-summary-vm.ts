import { bpsToPctText } from "@/utils/est-payout";
import { getBetQuip } from "@/utils/bet-quip";
import type { BetTypeId } from "@/state/betting-atom";
import { lamportsToSolTextTrim } from '@/utils/solana_helper';

export type BetSummaryVm = {
  // display texts
  usdText: string | null;

  // NEW: total + per-pick (per-pick only used for multi-pick types)
  selectedSolText: string | null;
  perPickSolText: string | null;

  // insight section (single-only)
  sharePctText: string | null;
  numberPoolSolText: string | null;
  estPayoutSolText: string | null;
  estPayoutUsdText: string | null;
  playerCountText: string | null;

  quip: string | null;
};

export function buildBetSummaryVm(args: {
  show: boolean;

  // NEW: multi-pick support
  betType: BetTypeId;
  numbers: number[];

  // single-only insight inputs (pass null when not single)
  payoutInfo: { shareBps: number; payoutLamports: bigint } | null;
  usdInfo: { solUsd: number; betUsdText: string } | null;
  playersOnNumber: number | null;
  numberPoolLamports?: bigint | null; // optional if/when you add it back

  // bet amounts
  betLamports: bigint | null;        // total
  perPickLamports: bigint | null;    // total / picks (computed by caller)

  // for quip + validation messaging
  minLamports: bigint | null;
  maxLamports: bigint | null;
  isBettingClosed: boolean;
}): BetSummaryVm | null {
  if (!args.show) return null;

  const {
    betType,
    numbers,
    payoutInfo,
    usdInfo,
    playersOnNumber,
    betLamports,
    perPickLamports,
  } = args;

  const isSingle = betType === 0 && numbers.length === 1;

  // --- Amount line (always shown when amount exists) ---
  const selectedSolText = betLamports != null ? lamportsToSolTextTrim(betLamports) : null;

  // For multi-pick bets, show "(X SOL each)" beside the chips.
  // For single, keep it null so the UI doesn't show it.
  const perPickSolText =
    !isSingle && perPickLamports != null ? lamportsToSolTextTrim(perPickLamports) : null;

  // --- Insight (single-only; pass null for multi-pick upstream) ---
  const sharePctText = payoutInfo ? bpsToPctText(payoutInfo.shareBps, 1) : null;

  const estPayoutSolText = payoutInfo
    ? lamportsToSolTextTrim(payoutInfo.payoutLamports)
    : null;

  const usdText = usdInfo?.betUsdText ?? null;

  const estPayoutUsdText =
    usdInfo && payoutInfo
      ? `$${((Number(payoutInfo.payoutLamports) / 1e9) * usdInfo.solUsd).toFixed(2)}`
      : null;

  // If you decide to show pool size again later, wire numberPoolLamports here.
  const numberPoolSolText =
    args.numberPoolLamports != null ? lamportsToSolTextTrim(args.numberPoolLamports) : null;

  const playerCountText = playersOnNumber != null ? String(playersOnNumber) : null;

  const quip = getBetQuip({
    playersOnNumber,
    betLamports: betLamports,
    payoutLamports: payoutInfo?.payoutLamports ?? null,
    shareBps: payoutInfo?.shareBps ?? null,
    minLamports: args.minLamports,
    maxLamports: args.maxLamports,
    isBettingClosed: args.isBettingClosed,
  });

  return {
    usdText,

    selectedSolText,
    perPickSolText,

    sharePctText,
    numberPoolSolText,
    estPayoutSolText,
    estPayoutUsdText,
    playerCountText,

    quip,
  };
}