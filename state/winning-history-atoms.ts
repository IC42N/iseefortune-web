import { atom } from "jotai";

/**
 * ---------------------------------------------
 * Types
 * ---------------------------------------------
 * Single resolved game result.
 * This is the minimal shape needed by the UI.
 */
export type WinningHistoryRow = {
  epoch: number;
  winningNumber: number;
};

/**
 * API response shape returned by
 * /api/winning-number-history
 */
type ApiResponse = {
  items: WinningHistoryRow[];
};

/**
 * ---------------------------------------------
 * Core State Atoms
 * ---------------------------------------------
 */

/**
 * Ordered list of recent winning results.
 *
 * Used by list-style UIs (e.g. "Last Winning Numbers").
 * The order is preserved exactly as returned by the API.
 */
export const winningHistoryListAtom = atom<WinningHistoryRow[]>([]);

/**
 * Map of winning results keyed by epoch.
 *
 * Used for random access from anywhere in the app:
 *   - lookup winning number for a specific epoch
 *   - cross-reference predictions / history / tooltips
 *
 * This acts as the canonical cache.
 */
export const winningHistoryByEpochAtom = atom<Map<number, WinningHistoryRow>>(
  new Map()
);

/**
 * Fetch lifecycle state for winning history.
 *
 * - loading: true while a fetch is in-flight
 * - error: user-visible error message (if any)
 * - lastLimit: highest `limit` value successfully fetched
 *
 * `lastLimit` is used to avoid refetching smaller datasets.
 */
export const winningHistoryStatusAtom = atom<{
  loading: boolean;
  error: string | null;
  lastLimit: number | null;
}>({
  loading: false,
  error: null,
  lastLimit: null,
});

/**
 * ---------------------------------------------
 * Write-only Atom: Prefetch Winning History
 * ---------------------------------------------
 *
 * This atom performs a *non-blocking* fetch of recent
 * winning numbers and populates the shared cache.
 *
 * Key properties:
 * - Safe to call multiple times
 * - Skips if already loading
 * - Skips if we already fetched >= requested limit
 * - Never clears existing cache on error
 *
 * Intended usage:
 * - Called once near app startup (soft prefetch)
 * - Optionally called again by components that
 *   require a larger history window
 */
export const prefetchWinningHistoryAtom = atom(
  null,
  async (get, set, args: { limit: number }) => {
    const { limit } = args;
    const status = get(winningHistoryStatusAtom);

    // Prevent overlapping requests
    if (status.loading) return;

    // If we already fetched at least this many rows, skip
    if (status.lastLimit !== null && status.lastLimit >= limit) return;

    // Mark fetch as in progress (preserve lastLimit)
    set(winningHistoryStatusAtom, {
      loading: true,
      error: null,
      lastLimit: status.lastLimit,
    });

    try {
      const res = await fetch(
        `/api/winning-number-history?limit=${limit}`,
        { cache: "no-store" }
      );

      // HTTP-level failure (do not throw; keep cache intact)
      if (!res.ok) {
        set(winningHistoryStatusAtom, {
          loading: false,
          error: `HTTP ${res.status}`,
          lastLimit: status.lastLimit,
        });
        return;
      }

      const json = (await res.json()) as ApiResponse;
      const items = Array.isArray(json.items) ? json.items : [];

      /**
       * Merge results into the epoch map.
       *
       * This ensures:
       * - existing epochs are preserved
       * - newer data overwrites stale entries
       * - partial fetches don't wipe known history
       */
      const prevMap = get(winningHistoryByEpochAtom);
      const nextMap = new Map(prevMap);
      for (const row of items) {
        nextMap.set(row.epoch, row);
      }
      set(winningHistoryByEpochAtom, nextMap);

      /**
       * Update the ordered list used by list UIs.
       * We intentionally replace this with the API result,
       * since the API already returns correctly ordered rows.
       */
      set(winningHistoryListAtom, items);

      // Mark fetch complete and record coverage
      set(winningHistoryStatusAtom, {
        loading: false,
        error: null,
        lastLimit: limit,
      });
    } catch (e: unknown) {
      /**
       * Network / runtime failure.
       * We DO NOT clear cached data here.
       */
      set(winningHistoryStatusAtom, {
        loading: false,
        error: "Failed to load",
        lastLimit: status.lastLimit,
      });

      const msg = e instanceof Error ? e.message : String(e);
      console.log("[winning-history] fetch failed", msg);
    }
  }
);

/**
 * ---------------------------------------------
 * Read Helpers
 * ---------------------------------------------
 */

/**
 * Read helper: get the full winning history row
 * for a specific epoch from the cache.
 *
 * Returns `undefined` if:
 * - data has not been fetched yet
 * - the epoch is outside the cached range
 */
export const winningRowForEpochAtom = (epoch: number) =>
  atom((get) => get(winningHistoryByEpochAtom).get(epoch));

/**
 * Convenience helper: get just the winning number
 * for a specific epoch.
 *
 * This is the most common lookup used by UI components.
 */
export const winningNumberForEpochAtom = (epoch: number) =>
  atom((get) =>
    get(winningHistoryByEpochAtom).get(epoch)?.winningNumber
  );