import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

/**
 * Smallest allowed increment for a bet.
 * 0.01 SOL = 10,000,000 lamports
 *
 * Using bigint avoids floating point precision issues.
 */
export const STEP_LAMPORTS = BigInt(LAMPORTS_PER_SOL / 100);

/**
 * Safety buffer to leave some lamports for transaction fees.
 * This prevents "insufficient funds" errors when betting max.
 */
export const FEE_BUFFER_LAMPORTS = 50_000n;


// Format slots for view
export function formatSlots(slots: number) {
  return `${slots.toLocaleString()} slots`;
}


// Used in BetModal
export function lamportsToUsdText(lamports: bigint, solUsd: number | null): string {
  if (!solUsd) return "";
  if (lamports <= 0n) return "";

  const sol = Number(lamports) / 1e9;
  const usd = sol * solUsd;

  return usd.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

/**
 * Converts a user-entered SOL string into lamports (bigint).
 *
 * Why this exists:
 * - Avoids JS floating point math (Number is unsafe for money)
 * - Allows partial input like "1", "1.", "0.25"
 * - Enforces max precision of 9 decimals (lamports)
 *
 * Returns:
 * - bigint lamports on success
 * - null if input is invalid
 */
export function parseSolToLamports(input: string): bigint | null {
  const s = input.trim();
  if (!s) return null;

  // Allow digits with optional decimal (e.g. "1", "1.", "1.23")
  if (!/^\d*(\.\d*)?$/.test(s)) return null;

  const [wholeRaw, fracRaw = ""] = s.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;

  /**
   * Pad or truncate fractional part to exactly 9 decimals
   * because 1 SOL = 1_000_000_000 lamports
   */
  const fracPadded = (fracRaw + "000000000").slice(0, 9);

  try {
    const w = BigInt(whole);
    const f = BigInt(fracPadded);
    return w * BigInt(LAMPORTS_PER_SOL) + f;
  } catch {
    return null;
  }
}

/**
 * Rounds a lamport value DOWN to the nearest allowed step.
 *
 * Example:
 * - 0.257 SOL → 0.25 SOL (if the step is 0.01)
 *
 * Used for:
 * - MAX button logic
 * - Fixing invalid user input safely
 */
export function roundDownToStep(
  lamports: bigint,
  step: bigint = STEP_LAMPORTS
) {
  return (lamports / step) * step;
}

/**
 * Checks whether a lamport value is aligned to the step size.
 *
 * Example:
 * - 0.25 SOL → ✅ valid
 * - 0.253 SOL → ❌ invalid
 *
 * Used in validation before allowing submit.
 */
export function isStepAligned(
  lamports: bigint,
  step: bigint = STEP_LAMPORTS
) {
  return lamports % step === 0n;
}

/**
 * Result type for bet amount validation.
 *
 * - ok: true → amount is valid, includes lamports
 * - ok: false → includes a user-facing error message
 */
export type AmountValidation =
  | { ok: true; lamports: bigint }
  | { ok: false; reason: string };

/**
 * Validates a user-entered bet amount against tier rules.
 *
 * Enforces:
 * - valid SOL input
 * - > 0
 * - min tier bet
 * - max tier bet
 * - 0.01 SOL increments
 *
 * This is what you should run:
 * - before enabling "Confirm Bet"
 * - before sending the transaction
 */
export function validateBetAmount(args: {
  solText: string;
  minLamports: bigint;
  maxLamports: bigint;
}): AmountValidation {
  const lamports = parseSolToLamports(args.solText);

  if (lamports == null)
    return { ok: false, reason: "Enter a valid amount." };

  if (lamports <= 0n)
    return { ok: false, reason: "Amount must be greater than 0." };

  if (lamports < args.minLamports)
    return {
      ok: false,
      reason: `Minimum bet is ${(Number(args.minLamports) / 1e9).toFixed(2)} SOL.`,
    };

  if (lamports > args.maxLamports)
    return {
      ok: false,
      reason: `Maximum bet is ${(Number(args.maxLamports) / 1e9).toFixed(2)} SOL.`,
    };

  if (!isStepAligned(lamports, STEP_LAMPORTS)) {
    const rounded = roundDownToStep(lamports, STEP_LAMPORTS);
    const roundedSol = (Number(rounded) / 1e9).toFixed(2);
    return {
      ok: false,
      reason: `Use 0.01 SOL increments (e.g. ${roundedSol}).`,
    };
  }

  return { ok: true, lamports };
}

/**
 * Computes the maximum bet the user can place right now.
 *
 * Behavior:
 * - Fetches the wallet balance fresh (no cached state)
 * - Subtracts a small fee buffer
 * - Caps to tier max
 * - Rounds DOWN to 0.01 SOL
 *
 * This is intentionally async and on-demand to avoid stale balance bugs.
 */
export async function computeMaxBetSolText(args: {
  connection: Connection;
  wallet: PublicKey;
  tierMaxLamports: bigint;
  tierMinLamports: bigint;
}): Promise<{ solText: string; lamports: bigint } | { error: string }> {
  const balNum = await args.connection.getBalance(
    args.wallet,
    "confirmed"
  );

  let bal = BigInt(balNum);

  // Not enough for even the minimum bet
  if (bal <= args.tierMinLamports)
    return { error: "Insufficient balance." };

  // Leave room for fees
  if (bal > FEE_BUFFER_LAMPORTS)
    bal -= FEE_BUFFER_LAMPORTS;

  // Enforce tier max
  const capped =
    bal < args.tierMaxLamports ? bal : args.tierMaxLamports;

  // Enforce step size
  const stepped = roundDownToStep(capped, STEP_LAMPORTS);

  if (stepped < args.tierMinLamports)
    return { error: "Insufficient balance for minimum bet." };

  /**
   * Format back to SOL text for input field.
   * 2 decimals is perfect because step is 0.01.
   */
  const solText = (Number(stepped) / 1e9).toFixed(2);

  return { solText, lamports: stepped };
}


// allow: "", ".", "0.", "1.", "1.2", "1.23", etc.
export function isSolInputInProgress(s: string): boolean {
  return /^\d*(\.\d*)?$/.test(s.trim());
}


export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function isAllZeroPubkeyBytes(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) if (bytes[i] !== 0) return false;
  return true;
}
