"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import type { ResolvedGameKey } from "@/state/resolved-game-atoms";
import { resolvedGamesByKeyAtom, upsertResolvedGamesAtom } from "@/state/resolved-game-atoms";
import { fetchResolvedGamesForBets } from "@/server/getResolvedGamesForBets";
import { ResolvedGameSummary } from '@/state/resolved-game-types';
import { PredictionReady } from '@/state/prediction-atoms';

type FetchKeyPayload = { gameEpoch: string; tier: number };

// Fetches a list of resolved games from Solana for the player's predictions.
export function useResolvedGamesForPredictions(predictions: PredictionReady[]) {
  const cache = useAtomValue(resolvedGamesByKeyAtom);
  const cacheRef = useRef(cache);
  useEffect(() => { cacheRef.current = cache; }, [cache]);

  const upsert = useSetAtom(upsertResolvedGamesAtom);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permanently "known missing" keys (for this hook instance)
  const notFoundKeysRef = useRef<Set<ResolvedGameKey>>(new Set());

  // request generation / cancellation
  const requestIdRef = useRef(0);

  // 1) unique keys needed by these bets
  const keys = useMemo(() => {
    const set = new Set<ResolvedGameKey>();
    for (const p of predictions) {
      set.add(`${p.gameEpoch.toString()}:${p.tier}` as ResolvedGameKey);
    }
    return Array.from(set);
  }, [predictions]);

  // 2) only fetch the keys, not already cached AND not permanently missing
  const missing = useMemo(() => {
    return keys.filter((k) => !cache.has(k) && !notFoundKeysRef.current.has(k));
  }, [keys, cache]);

  // stable signature so effect only runs when missing set changes meaningfully
  const missingSig = useMemo(() => missing.join("|"), [missing]);

  useEffect(() => {
    if (!missingSig) return;

    const myRequestId = ++requestIdRef.current;
    let cancelled = false;

    async function run() {
      setError(null);
      setLoading(true);

      try {
        const payload: FetchKeyPayload[] = missing.map((k) => {
          const [gameEpochStr, tierStr] = k.split(":");
          return { gameEpoch: gameEpochStr, tier: Number(tierStr) };
        });

        const requested = new Set<ResolvedGameKey>(missing);

        const MAX_TRIES = 4;
        let record: Record<string, ResolvedGameSummary> = {};

        // Fetch all the resolved games for each game pda key associated with the player's bet
        for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
          record = await fetchResolvedGamesForBets(payload);

          if (cancelled || myRequestId !== requestIdRef.current) return;

          // upsert partials immediately (reduces repeat work)
          if (Object.keys(record).length > 0) upsert(record);

          // use cacheRef (fresh)
          let allSatisfied = true;
          for (const k of requested) {
            if (!cacheRef.current.has(k) && !(k in record)) {
              allSatisfied = false;
              break;
            }
          }
          if (allSatisfied) break;

          await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt - 1)));
        }

        // mark it not found using cacheRef too
        for (const k of requested) {
          if (!cacheRef.current.has(k) && !(k in record)) {
            notFoundKeysRef.current.add(k);
          }
        }
      } catch (e) {
        if (!cancelled && myRequestId === requestIdRef.current) {
          setError(e instanceof Error ? e.message : "Failed to load resolved games");
        }
      } finally {
        if (!cancelled && myRequestId === requestIdRef.current) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
    // IMPORTANT: only depend on missingSig and upsert
    // cache changes should not constantly restart this request
  }, [missingSig, upsert]); // ✅ simplified deps

  return {
    resolvedGames: cache,
    loading,
    error,
    notFoundKeys: notFoundKeysRef.current, // ✅ stable Set instance
  };
}