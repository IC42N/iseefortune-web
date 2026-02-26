import { useEffect, useRef, useState } from "react";

/**
 * Debounce a boolean signal for UI warnings / banners.
 *
 * - When `value` turns true: waits `showDelayMs`, then becomes true.
 * - When `value` turns false: waits `hideDelayMs`, then becomes false.
 *
 * Notes:
 * - Uses timers for both show + hide to avoid "setState synchronously in effect"
 *   ESLint warnings and reduce render cascades during rapid changes (slider drag).
 */
export function useDebouncedBool(
  value: boolean,
  showDelayMs = 1000,
  hideDelayMs = 0
): boolean {
  const [debounced, setDebounced] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending transition
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const delay = value ? showDelayMs : hideDelayMs;

    timerRef.current = setTimeout(() => {
      setDebounced(value);
      timerRef.current = null;
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, showDelayMs, hideDelayMs]);

  return debounced;
}