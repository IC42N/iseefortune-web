import type { BetTypeId } from "@/state/betting-atom";

// ✅ Set these to your REAL Rust constants:
export const PRED_TYPE = {
  SINGLE_NUMBER: 0,
  TWO_NUMBERS: 1,
  HIGH_LOW: 2,
  EVEN_ODD: 3,
  MULTI_NUMBER: 4,
} as const;

export type PredictionTypeU8 =
  typeof PRED_TYPE[keyof typeof PRED_TYPE];

export function uiBetTypeToPredictionType(args: {
  uiBetType: BetTypeId;
  picksCount: number;
}): PredictionTypeU8 {
  const { uiBetType, picksCount } = args;

  if (uiBetType === 0) return PRED_TYPE.SINGLE_NUMBER;

  if (uiBetType === 1) {
    if (picksCount === 2) return PRED_TYPE.TWO_NUMBERS;
    if (picksCount >= 3 && picksCount <= 8) return PRED_TYPE.MULTI_NUMBER;
    throw new Error("Multi pick count must be 2..8.");
  }

  if (uiBetType === 2) return PRED_TYPE.HIGH_LOW;
  if (uiBetType === 3) return PRED_TYPE.EVEN_ODD;

  // unreachable
  return PRED_TYPE.SINGLE_NUMBER;
}


export function normalizePicks(args: {
  picks: number[] | undefined;
  allowedNumbers: readonly number[]; // 1..9 minus blocked_secondary, etc.
}): number[] {
  const { picks, allowedNumbers } = args;
  const allowed = new Set<number>(allowedNumbers);

  return Array.from(
    new Set(
      (picks ?? [])
        .filter((n) => Number.isInteger(n) && allowed.has(n))
        .map((n) => Number(n))
    )
  ).sort((a, b) => a - b);
}

export function assertU8(name: string, v: number) {
  if (!Number.isInteger(v) || v < 0 || v > 255) {
    throw new Error(`${name} must be a u8 (0..255). Got ${v}`);
  }
}

export function betTypeToU8(betType: BetTypeId | null | undefined): number {
  const bt = betType ?? 0;
  return bt === 0 || bt === 1 || bt === 2 || bt === 3 ? bt : 0;
}

/**
 * Decimal digit encoding to match decode_choice_digits() on-chain.
 * IMPORTANT: This is NOT concatenation of sorted picks necessarily.
 * It just needs to be a number whose decimal digits are the selected numbers.
 *
 * Example picks [3,7] => 37 (or 73 is also valid, chain will canonicalize).
 * We'll generate ascending digits => stable choice.
 */
export function encodeChoiceDigitsDecimal(picksAscUnique: number[]): number {
  if (picksAscUnique.length === 0) throw new Error("No picks provided.");

  // Build stable ascending digits (canonical)
  let out = 0;
  for (const n of picksAscUnique) {
    if (!Number.isInteger(n) || n < 1 || n > 9) {
      throw new Error(`Invalid digit pick ${n}. Must be 1..9.`);
    }
    out = out * 10 + n;
  }

  // u32 safe: max 8 digits, each 1..9 => <= 99,999,999
  return out;
}

export type HighLowSide = "low" | "high";
export type EvenOddSide = "even" | "odd";

/**
 * Infer HIGH/LOW side from picks based on Rust logic:
 * eligible = [1..9] excluding blocked_secondary
 * LOW = first 4 eligible, HIGH = last 4 eligible
 */
export function inferHighLowSide(args: {
  allowedNumbers: readonly number[]; // should already exclude blocked_secondary
  picksAscUnique: number[];
}): HighLowSide | null {
  const { allowedNumbers, picksAscUnique } = args;
  if (allowedNumbers.length !== 8) return null;

  const eligible = [...allowedNumbers].sort((a, b) => a - b);
  const low = eligible.slice(0, 4);
  const high = eligible.slice(4, 8);

  const p = picksAscUnique;
  const same = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  if (same(p, low)) return "low";
  if (same(p, high)) return "high";
  return null;
}

/**
 * Infer EVEN/ODD from picks based on Rust logic:
 * eligible = [1..9] excluding blocked_secondary
 * want even => [2,4,6,8] minus blocked_secondary if applicable
 * want odd  => [1,3,5,7,9] minus blocked_secondary if applicable
 */
export function inferEvenOddSide(args: {
  allowedNumbers: readonly number[];
  picksAscUnique: number[];
}): EvenOddSide | null {
  const { allowedNumbers, picksAscUnique } = args;
  const eligible = [...allowedNumbers].sort((a, b) => a - b);
  const evens = eligible.filter((n) => n % 2 === 0);
  const odds = eligible.filter((n) => n % 2 === 1);

  const p = picksAscUnique;
  const same = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  if (same(p, evens)) return "even";
  if (same(p, odds)) return "odd";
  return null;
}

/**
 * Encode choice exactly how derive_prediction_selections expects.
 *
 * Mapping UI betType -> on-chain types must match your Prediction::TYPE_* constants.
 * If your BetTypeId enum corresponds 1:1, you're good. If not, map here.
 *
 * Rust expectations:
 * - SINGLE_NUMBER: exactly 1 digit
 * - TWO_NUMBERS: exactly 2 digits
 * - MULTI_NUMBER: 3..=8 digits
 * - HIGH_LOW: mode 0=low, 1=high
 * - EVEN_ODD: mode 0=even, 1=odd
 */
export function encodeChoice(args: {
  predictionTypeU8: number;            // Prediction::TYPE_*
  picksAscUnique: number[];
  allowedNumbers: readonly number[];
  explicitHighLow?: HighLowSide;
  explicitEvenOdd?: EvenOddSide;
}): number {
  const {
    predictionTypeU8,
    picksAscUnique,
    allowedNumbers,
    explicitHighLow,
    explicitEvenOdd,
  } = args;

  // NOTE: you can import the numeric constants into TS too, if you expose them in IDL types.
  // For now assume:
  // 0 single, 1 two_numbers, 2 high_low, 3 even_odd, 4 multi (example)
  // -> Replace these comparisons with your actual constants if different.

  // If your betType already equals these constants, this works directly.
  switch (predictionTypeU8) {
    case 0: { // TYPE_SINGLE_NUMBER
      if (picksAscUnique.length !== 1) throw new Error("Single requires exactly 1 number.");
      return encodeChoiceDigitsDecimal(picksAscUnique);
    }

    case 1: { // TYPE_TWO_NUMBERS
      if (picksAscUnique.length !== 2) throw new Error("Two-numbers requires exactly 2 numbers.");
      return encodeChoiceDigitsDecimal(picksAscUnique);
    }

    case 2: { // TYPE_HIGH_LOW
      const side = explicitHighLow ?? inferHighLowSide({ allowedNumbers, picksAscUnique });
      if (!side) throw new Error("High/Low preset not recognized.");
      return side === "low" ? 0 : 1;
    }

    case 3: { // TYPE_EVEN_ODD
      const side = explicitEvenOdd ?? inferEvenOddSide({ allowedNumbers, picksAscUnique });
      if (!side) throw new Error("Even/Odd preset not recognized.");
      return side === "even" ? 0 : 1;
    }

    case 4: { // TYPE_MULTI_NUMBER
      if (picksAscUnique.length < 3 || picksAscUnique.length > 8) {
        throw new Error("Multi requires 3 to 8 numbers.");
      }
      return encodeChoiceDigitsDecimal(picksAscUnique);
    }

    default:
      throw new Error(`Unknown predictionTypeU8=${predictionTypeU8}`);
  }
}

export function validateLamportsU64(lamports: bigint): bigint {
  if (lamports <= 0n) throw new Error("Pick an amount first.");
  const U64_MAX = 18_446_744_073_709_551_615n;
  if (lamports > U64_MAX) throw new Error("Lamports exceeds u64 max.");
  return lamports;
}