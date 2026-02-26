export function formatPct(value: number, decimals = 1): string {
  return value
    .toFixed(decimals)        // e.g. "12.0", "12.5"
    .replace(/\.0+$/, "")     // remove ".0", ".00"
    .replace(/(\.\d*[1-9])0+$/, "$1"); // trim trailing zeros like "12.50" → "12.5"
}

export function formatBigint(n: bigint) {
  // safe-ish formatting for bigints that fit in JS number range
  const s = n.toString();
  // simple comma grouping
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function bpsToPercentText(bps: number, decimals = 0): string {
  return `${(bps / 100).toFixed(decimals)}%`;
}

/**
 * Clamp a number to an inclusive [min, max] range.
 *
 * Commonly used for:
 * - Slider indices
 * - Pagination bounds
 * - Defensive UI state checks
 */
export function clampInt(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}

/**
 * Return the smaller of two bigint values.
 *
 * JavaScript Math.min does not support bigint, so this helpers
 * is used anywhere lamports or other bigint values must be compared.
 */
export function minBig(a: bigint, b: bigint) {
  return a < b ? a : b;
}
