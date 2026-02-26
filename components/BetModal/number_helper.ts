import { sameNumberSet } from '@/components/BetModal/utils';
import { BetTypeId } from '@/state/betting-atom';

/**
 * High / Low preset selector.
 *
 * These are NOT static number sets.
 * They are derived dynamically from the current `allowed` number order,
 * which already accounts for rollover exclusions.
 */
type HLChoice = "high" | "low";

/**
 * Odd / Even preset selector.
 *
 * Odds / evens are also dynamic because `allowed` can change each game.
 */
type OEChoice = "odd" | "even";

/**
 * Number of picks used for preset-style bets (high/low, odd/even).
 *
 * Even though odd can have 5 numbers (1,3,5,7,9),
 * the preset uses 4 picks to enforce the minimum-bet rule.
 */
const PRESET_PICKS = 4;

/**
 * Builds a HIGH or LOW preset from the current allowed number order.
 *
 * - `allowed` is already filtered to exclude rollover numbers.
 * - Order matters: LOW = first N numbers, HIGH = last N numbers.
 *
 * Example:
 *   allowed = [1,2,3,4,5,6,7,8,9]
 *   low  → [1,2,3,4]
 *   high → [6,7,8,9]
 *
 * If there are fewer than N numbers available, we return all of them.
 */
export function presetHighLow(allowed: number[], side: HLChoice, k = PRESET_PICKS) {
  if (allowed.length <= k) return [...allowed];
  return side === "low"
    ? allowed.slice(0, k)
    : allowed.slice(allowed.length - k);
}

/**
 * Builds an ODD or EVEN preset from the current allowed numbers.
 *
 * - Filters allowed numbers by parity.
 * - Preserves dynamic ordering (affected by rollover).
 * - Uses only the first N values to enforce preset size.
 *
 * Example:
 *   allowed = [1,2,3,4,5,6,7,8,9]
 *   odd  → [1,3,5,7,9]
 *   even → [2,4,6,8]
 */
export function presetOddEven(allowed: number[], side: OEChoice) {
  const isOdd = (n: number) => (n % 2) === 1;
  return allowed.filter((n) => (side === "odd" ? isOdd(n) : !isOdd(n)));
}

/**
 * Detects whether the user's current picks EXACTLY match
 * the dynamic HIGH or LOW preset for this game.
 *
 * Used to decide:
 * - Should the bet remain "high_low"?
 * - Or has the user customized it enough to switch to "split"?
 *
 * Returns:
 * - "high" if picks match high preset
 * - "low"  if picks match low preset
 * - null   if picks no longer match a preset
 */
export function detectHighLowPreset(
  allowed: number[],
  picks: number[],
  k = PRESET_PICKS
): HLChoice | null {
  if (sameNumberSet(picks, presetHighLow(allowed, "high", k))) return "high";
  if (sameNumberSet(picks, presetHighLow(allowed, "low", k))) return "low";
  return null;
}

/**
 * Detects whether the user's current picks EXACTLY match
 * the dynamic ODD or EVEN preset for this game.
 *
 * Same purpose as detectHighLowPreset, but for odd/even logic.
 */
export function detectOddEvenPreset(
  allowed: number[],
  picks: number[],
): OEChoice | null {
  if (sameNumberSet(picks, presetOddEven(allowed, "odd"))) return "odd";
  if (sameNumberSet(picks, presetOddEven(allowed, "even"))) return "even";
  return null;
}

/**
 * Auto-switches bet type when the user "breaks" a preset.
 *
 * Core UX rule:
 * - high_low and odd_even are PRESET modes
 * - If the user's picks no longer match the preset,
 *   we convert the bet to a fully custom SPLIT bet.
 *
 * This allows:
 * - Presets for quick selection
 * - Full customization without blocking or errors
 *
 * Behavior:
 * - betType 2 (high_low) → stays if still matches preset, else → split (1)
 * - betType 3 (odd_even) → stays if still matches preset, else → split (1)
 * - other bet types are unaffected
 */
export function maybeAutoSwitchToSplit(
  betType: BetTypeId,
  allowed: number[],
  picks: number[]
) {
  if (betType === 2) {
    return detectHighLowPreset(allowed, picks) ? 2 : 1;
  }
  if (betType === 3) {
    return detectOddEvenPreset(allowed, picks) ? 3 : 1;
  }
  return betType;
}


// Returns minimum number of picks required for a given bet type
export function minPicksForBetType(t: BetTypeId): number {
  switch (t) {
    case 0: return 1; // single
    case 1: return 2; // split
    case 2: return 4; // high_low
    case 3: return 4; // odd_even
    default: return 1;
  }
}


// If picks exactly match a preset, return the matching betType.
// Otherwise return split (1).
export function detectPresetBetType(allowed: number[], picks: number[]): BetTypeId {
  if (picks.length === 0) return 1;

  // Match HIGH/LOW? -> betType 2
  if (detectHighLowPreset(allowed, picks)) return 2;

  // Match ODD/EVEN? -> betType 3
  if (detectOddEvenPreset(allowed, picks)) return 3;

  // Otherwise -> custom split
  return 1;
}