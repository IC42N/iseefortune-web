"use client";

import { useEffect, useState } from "react";
import { useSetAtom } from "jotai";
import { viewedProfileStatsAtom, viewedProfilePublicAtom } from "@/state/player-profile-atoms";
import { fetchViewedProfileByHandle } from "@/client/fetchViewedProfileByHandle";

export function useViewedProfileByHandle(
  handle: string | null | undefined,
  opts?: { enabled?: boolean }
) {
  const enabled = opts?.enabled ?? true;

  const setViewedStats = useSetAtom(viewedProfileStatsAtom);
  const setViewedProfile = useSetAtom(viewedProfilePublicAtom);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const h = (handle ?? "").trim().toUpperCase();

      if (!enabled || !h) {
        setViewedStats(null);
        setViewedProfile(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchViewedProfileByHandle(h);
        if (cancelled) return;

        setViewedProfile(data?.profile ?? null);
        setViewedStats(data?.stats ?? null);

        setLoading(false);
      } catch (e) {
        if (cancelled) return;

        setViewedProfile(null);
        setViewedStats(null);
        setLoading(false);
        setError(e instanceof Error ? e.message : "Failed to load viewed profile");
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [handle, enabled, setViewedProfile, setViewedStats]);

  return { loading, error };
}