export type PredictionResultUI =
  | "WON"
  | "MISS"
  | "IN_PROGRESS"
  | "LOADING"
  | "NOT_FOUND";


export function calcRoiPercent(wager: bigint, payout?: bigint): number | undefined {
  if (wager <= 0n || payout == null) return undefined;

  const profit = payout - wager;

  // Use integer math for stability; return to number for UI.
  // (If you want 1 decimal place, we can do bps-style scaling.)
  const roi = (profit * 100n) / wager;
  return Number(roi);
}