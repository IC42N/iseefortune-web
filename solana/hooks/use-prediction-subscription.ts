"use client";

import { useEffect, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAtomValue, useSetAtom } from "jotai";

import { selectedTierAtom } from "@/state/tier-atoms";
import { configReadyAtom } from "@/state/config-atoms";
import { liveFeedDecodedAtom } from "@/state/live-feed-atoms";

import {
  clearTierPredictionsAtom,
  setTierPredictionsSnapshotAtom,
  upsertPredictionAtom,
  setPredictionHydrationStatusAtom, PredictionReady
} from '@/state/prediction-atoms';

import { PROGRAM_ID } from "@/solana/anchor-client";
import { loadPredictionsSnapshotForGameEpochTier } from "@/solana/hooks/load-predictions-snapshot";
import { subscribeToPredictionsForGameEpochTier } from '@/solana/subscriptions/predictions';

/**
 * ------------------------------------------------------------
 * usePredictionSubscription
 * ------------------------------------------------------------
 *
 * Keeps prediction state hydrated for a given:
 *   - gameEpoch (LiveFeed.first_epoch_in_chain)
 *   - tier
 *
 * Flow:
 *   1) Load snapshot via RPC (getProgramAccounts)
 *   2) Hydrate Jotai state in one shot
 *   3) Subscribe via websocket for live updates
 *   4) Cleanly teardown on tier / epoch change
 */
export function usePredictionSubscription(opts?: { tier?: number }) {
  const tierFromAtom = useAtomValue(selectedTierAtom);
  const tier = opts?.tier ?? tierFromAtom;

  const { connection } = useConnection();

  const liveFeed = useAtomValue(liveFeedDecodedAtom);
  const gameEpoch = liveFeed?.first_epoch_in_chain ?? null;
  const configReady = useAtomValue(configReadyAtom);

  const clearTierPredictions = useSetAtom(clearTierPredictionsAtom);
  const setPredictionsSnapshot = useSetAtom(setTierPredictionsSnapshotAtom);
  const upsertPrediction = useSetAtom(upsertPredictionAtom);
  const setPredictionHydration = useSetAtom(setPredictionHydrationStatusAtom);

  // Holds the active websocket unsubscribe fn
  const stopRef = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    let disposed = false;

    if (!configReady) return;
    if (gameEpoch == null) return;

    // Immediately stop any previous subscription
    const stopPrev = stopRef.current;
    stopRef.current = null;
    if (stopPrev) stopPrev().catch(() => {});

    // Mark hydration as loading (do NOT clear UI lists yet)
    setPredictionHydration({ gameEpoch, tier, status: "loading" });

    (async () => {
      try {
        // --------------------------------------------------
        // 1) SNAPSHOT
        // --------------------------------------------------
        const predictions = await loadPredictionsSnapshotForGameEpochTier({
          connection,
          programId: PROGRAM_ID,
          gameEpoch,
          tier,
        });

        if (disposed) return;

        setPredictionsSnapshot({ gameEpoch, tier, predictions });

        // --------------------------------------------------
        // 2) LIVE SUBSCRIPTION
        // --------------------------------------------------
        const sub = subscribeToPredictionsForGameEpochTier({
          connection,
          programId: PROGRAM_ID,
          gameEpoch,
          tier,
          onPrediction: (prediction: PredictionReady) => {
            if (disposed) return;
            upsertPrediction({ gameEpoch, tier, prediction });
          },
          onError: (e: unknown) => {
            if (disposed) return;
            console.error("prediction subscription error", e);
          },
        });

        stopRef.current = sub.stop;
        setPredictionHydration({ gameEpoch, tier, status: "ready" });
      } catch (e) {
        console.error("prediction snapshot hydration failed", e);
        setPredictionHydration({ gameEpoch, tier, status: "error" });
      }
    })();

    return () => {
      disposed = true;
      const stop = stopRef.current;
      stopRef.current = null;
      if (stop) stop().catch(() => {});
    };
  }, [
    connection,
    configReady,
    tier,
    gameEpoch,
    clearTierPredictions,
    setPredictionsSnapshot,
    upsertPrediction,
    setPredictionHydration,
  ]);
}