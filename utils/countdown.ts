export function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}


/**
 * Format a number of Solana slots for UI display.
 *
 * Used anywhere slots are shown to users (epoch countdowns, cutoffs, progress).
 * Adds the thousands separators and appends the "slots" label.
 */
export function formatSlots(slots: number) {
  return `${slots.toLocaleString()} slots`;
}