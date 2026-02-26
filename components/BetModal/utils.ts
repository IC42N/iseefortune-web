/**
 * Checks if two sets of numbers contain the same values, including duplicates.
 * @param a
 * @param b
 */
export function sameNumberSet(a: number[], b: number[]) {
  // If lengths differ, they cannot contain the same values
  // (including duplicates)
  if (a.length !== b.length) return false;

  // Create shallow copies so we don't mutate the original arrays,
  // then sort numerically (not lexicographically)
  const aa = [...a].sort((x, y) => x - y);
  const bb = [...b].sort((x, y) => x - y);

  // Compare each value at the same index after sorting
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) return false;
  }

  // All values match in the same counts and positions
  return true;
}


/**
 * Return the modal/title text based on the current betting mode.
 *
 * Keeps UI copy centralized and decoupled from business logic.
 */
export function getTitleForMode(mode: string | null) {
  switch (mode) {
    case "addLamports":
      return "INCREASE YOUR POSITION";
    case "changeNumber":
      return "CHANGE YOUR PREDICTION";
    case "new":
    default:
      return "PLACE YOUR PREDICTION";
  }
}

/**
 * Return the primary confirmation button text for the current betting mode.
 *
 * Ensures the call-to-action language stays consistent across the app.
 */
export function getConfirmTextForMode(mode: string | null) {
  switch (mode) {
    case "addLamports":
      return "ADD SOL";
    case "changeNumber":
      return "CHANGE NUMBER";
    case "new":
    default:
      return "SUBMIT PREDICTION";
  }
}


// Split the betting amount evenly and return the remainder to check if it was evenly split
export function splitLamportsEvenly(total: bigint, parts: number) {
  const p = BigInt(Math.max(1, parts));
  const per = total / p;
  const remainder = total - per * p; // same as total % p
  return { per, remainder }; // remainder is in lamports
}


/**
 * Convert a lamports value into a discrete slider index.
 *
 * - Clamps the value between minLamports and maxLamports
 * - Normalizes against minLamports
 * - Divides by STEP_LAMPORTS to produce a slider step index
 *
 * Used to keep slider position perfectly aligned with lamports-based values.
 */
// export function lamportsToIndex(opts: {
//   lamports: bigint;
//   minLamports: bigint;
//   maxLamports: bigint;
// }) {
//   const { lamports, minLamports, maxLamports } = opts;
//   const clamped = minBig(
//     maxLamports,
//     lamports < minLamports ? minLamports : lamports
//   );
//   return Number((clamped - minLamports) / STEP_LAMPORTS);
// }