"use client";

import { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import { resolvedGamePdaByKeyAtom, upsertResolvedGamePdaAtom } from "@/state/resolved-game-pda-atoms";
import { fetchResolvedGameDecoded } from "@/solana/fetch/fetch-resolved-game";
import { ResolvedGameUI } from '@/state/resolved-game-types';
import { toResolvedGameUI } from '@/solana/map/resolved-game';
import { Cluster } from "@/solana/chain-context";


type Args = {
  epoch: bigint | null;
  tier: number | null;
  cluster?: Cluster;
  enabled?: boolean;
};

export function useResolvedGameCached({ epoch, tier, cluster = "mainnet", enabled = true }: Args) {
  const cache = useAtomValue(resolvedGamePdaByKeyAtom);
  const upsert = useSetAtom(upsertResolvedGamePdaAtom);

  const key = useMemo(() => {
    if (epoch == null || tier == null) return null;
    return `${epoch.toString()}:${tier}` as const;
  }, [epoch, tier]);

  const cached = key ? cache.get(key) ?? null : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!enabled) return;
      if (!key || epoch == null || tier == null) return;

      // Already cached -> no refetch
      if (cached) return;

      setLoading(true);
      setError(null);

      try {
        const decoded = await fetchResolvedGameDecoded({ epoch, tier, cluster });
        if (!alive) return;

        if (!decoded) {
          setError("No game data was found for this epoch");
          setLoading(false); // optional, but explicit
          return;
        }

        const dataUI: ResolvedGameUI = toResolvedGameUI(decoded);
        upsert({ key, epoch, tier, data: dataUI });
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [enabled, key, epoch, tier, cluster, cached, upsert]);

  return {
    key,
    data: cached?.data ?? null,
    loading: !cached && loading,
    error,
    isCached: Boolean(cached),
  };
}