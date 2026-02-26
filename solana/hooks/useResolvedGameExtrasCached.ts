"use client";

import { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import {
  resolvedGameExtrasByKeyAtom,
  upsertResolvedGameExtrasAtom,
  type ResolvedGameExtras,
  type ResolvedGameKey,
} from "@/state/resolved-game-extras-atoms";

import {
  parseTicketsJsonObject,
  parseWinnersFromIJsonObject,
} from "@/solana/fetch/parse-resolved-game-extras";
import { fetchResolvedGameExtrasViaApi } from '@/solana/fetch/fetch-resolved-extras-text';

type Args = {
  epoch: bigint | null;
  tier: number | null;
  enabled?: boolean;
};

export function useResolvedGameExtrasCached({
  epoch,
  tier,
  enabled = true,
}: Args) {
  const cache = useAtomValue(resolvedGameExtrasByKeyAtom);
  const upsert = useSetAtom(upsertResolvedGameExtrasAtom);

  const key = useMemo(() => {
    if (epoch == null || tier == null) return null;
    return `${epoch.toString()}:${tier}` as ResolvedGameKey;
  }, [epoch, tier]);

  const cached = key ? cache.get(key) ?? null : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!enabled) return;
      if (!key || epoch == null || tier == null) return;
      if (cached) return; // ✅ one fetch per key

      setLoading(true);
      setError(null);

      try {
        const resp = await fetchResolvedGameExtrasViaApi({ epoch, tier });
        if (!alive) return;

        const winners = parseWinnersFromIJsonObject(resp.full.json);

        const extra: ResolvedGameExtras = {
          key,
          fetchedAtMs: Date.now(),
          winners,
        };

        if (resp.tickets?.json != null) {
          const tickets = parseTicketsJsonObject(resp.tickets.json);
          extra.tickets = tickets;
          extra.total_losers = tickets.total_losers;
          extra.total_ticket_recipients = tickets.total_ticket_recipients;
        }

        upsert(extra);
      } catch (e: unknown) {
        console.warn("Failed to fetch resolved game extras:", e);
        setLoading(false)
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load extras");
      } finally {
        if (!alive) setLoading(false);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [enabled, key, epoch, tier, cached, upsert]);

  return {
    key,
    data: cached,
    winners: cached?.winners ?? null,
    tickets: cached?.tickets ?? null,
    loading: !cached && loading,
    error,
    isCached: Boolean(cached),
  };
}