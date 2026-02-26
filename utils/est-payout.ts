export type EstimatePayoutInput = {
  betLamports: bigint;          // user's current selected bet
  numberPoolLamports: bigint;   // total lamports currently on that number (excluding user's new bet)
  totalPotLamports: bigint;     // total lamports currently in the pot across ALL numbers (excluding user's new bet)

  // whether to treat the estimate as "after you submit this bet"
  includeSelfInPools?: boolean; // default true

  // optional protocol fee taken from pot before payout (bps = 1/100 of a percent)
  feeBps?: number;             // e.g. 500 = 5.00%
};

export type EstimatePayoutResult = {
  shareBps: number;        // player's share of that winning-number pool, in bps
  payoutLamports: bigint;  // estimated payout in lamports (after fee if feeBps provided)
};

function clampBps(x: number) {
  if (x < 0) return 0;
  if (x > 10_000) return 10_000;
  return x;
}

// bigint safe mul/div: floor(a*b/den)
function mulDivFloor(a: bigint, b: bigint, den: bigint): bigint {
  if (den === 0n) return 0n;
  return (a * b) / den;
}

export function estimatePayout({
 betLamports,
 numberPoolLamports,
 totalPotLamports,
 includeSelfInPools = true,
 feeBps = 0,
}: EstimatePayoutInput): EstimatePayoutResult {
  if (betLamports <= 0n) return { shareBps: 0, payoutLamports: 0n };

  const numberPoolAfter = includeSelfInPools
    ? numberPoolLamports + betLamports
    : numberPoolLamports;

  const potAfter = includeSelfInPools
    ? totalPotLamports + betLamports
    : totalPotLamports;

  if (numberPoolAfter <= 0n || potAfter <= 0n) {
    return { shareBps: 0, payoutLamports: 0n };
  }

  // share in bps (floor)
  const shareBps = clampBps(
    Number(mulDivFloor(betLamports, 10_000n, numberPoolAfter))
  );

  // apply fee to pot
  const fee = clampBps(feeBps);
  const netPot = fee > 0
    ? mulDivFloor(potAfter, BigInt(10_000 - fee), 10_000n)
    : potAfter;

  // payout = share * netPot
  const payoutLamports = mulDivFloor(netPot, BigInt(shareBps), 10_000n);

  return { shareBps, payoutLamports };
}

// Formatting helpers (optional)
export function bpsToPctText(bps: number, decimals = 1): string {
  const pct = bps / 100; // 100 bps = 1.00%
  return `${pct.toFixed(decimals)}%`;
}