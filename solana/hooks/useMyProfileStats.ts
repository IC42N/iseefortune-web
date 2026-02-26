"use client";

import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { myPlayerAtom, myProfileStatsAtom, PlayerProfileStats } from "@/state/player-profile-atoms";

type ApiResponse =
  | { ok: true; stats: PlayerProfileStats | null }
  | { ok: false; error: string };

async function fetchProfileStats(playerBase58: string, signal: AbortSignal): Promise<PlayerProfileStats | null> {
  const res = await fetch(`/api/profile-stats?player=${encodeURIComponent(playerBase58)}`, {
    cache: "no-store",
    signal,
  });
  const json: ApiResponse = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.stats;
}

export function useMyProfileStats(shouldFetchStats: boolean) {
  const me = useAtomValue(myPlayerAtom);
  const setStats = useSetAtom(myProfileStatsAtom);

  const lastPlayerRef = useRef<string | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const playerBase58 = me?.toBase58() ?? null;

    // If we can't/shouldn't fetch, wipe stats and reset "last"
    if (!playerBase58 || !shouldFetchStats) {
      setStats(null);
      lastPlayerRef.current = null;
      // invalidate any in-flight request
      reqIdRef.current++;
      return;
    }

    // Same wallet, no need to refetch
    if (lastPlayerRef.current === playerBase58) return;
    lastPlayerRef.current = playerBase58;

    const myReqId = ++reqIdRef.current;
    const controller = new AbortController();

    (async () => {
      try {
        const stats = await fetchProfileStats(playerBase58, controller.signal);

        // Ignore if a newer request started or we were aborted
        if (controller.signal.aborted) return;
        if (myReqId !== reqIdRef.current) return;

        setStats(stats);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (myReqId !== reqIdRef.current) return;

        setStats(null);
        console.warn("useMyProfileStats failed:", err);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [me, shouldFetchStats, setStats]);
}