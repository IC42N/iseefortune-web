"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { prefetchWinningHistoryAtom } from "@/state/winning-history-atoms";

/**
 * Non-blocking prefetch of the last winning numbers.
 * Safe to call multiple times; atom guards prevent duplicate work.
 */
export function useWinningHistoryPrefetch(args?: {
  limit?: number;
  enabled?: boolean;
}) {
  const limit = args?.limit ?? 50;
  const enabled = args?.enabled ?? true;

  const prefetch = useSetAtom(prefetchWinningHistoryAtom);

  useEffect(() => {
    if (!enabled) return;
    void prefetch({ limit });
  }, [enabled, limit, prefetch]);
}