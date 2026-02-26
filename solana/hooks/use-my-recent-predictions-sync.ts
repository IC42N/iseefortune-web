"use client";

import { useEffect, useMemo, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAtomValue, useSetAtom } from "jotai";
import { myProfileAtom } from "@/state/player-profile-atoms";
import { myRecentPredictionsAtom, myRecentPredictionsErrorAtom, myRecentPredictionsLoadingAtom, myRecentPredictionsRefreshNonceAtom, myRecentPredictionsVersionKeyAtom } from '@/state/prediction-atoms';
import { fetchRecentPredictionsOneShot } from '@/solana/predicitons';
import { withTimeout } from '@/utils/async';

export function useMyRecentPredictionsSync(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 40;
  const { connection } = useConnection();

  const myProfile = useAtomValue(myProfileAtom);
  const versionKey = myProfile?.recentBetsVersionKey ?? null;

  const setPredictions = useSetAtom(myRecentPredictionsAtom);
  const setVK = useSetAtom(myRecentPredictionsVersionKeyAtom);
  const setLoading = useSetAtom(myRecentPredictionsLoadingAtom);
  const setError = useSetAtom(myRecentPredictionsErrorAtom);
  const refreshNonce = useAtomValue(myRecentPredictionsRefreshNonceAtom);

  const recentPredictionPdas = useMemo(() => {
    if (!myProfile) return [];

    //console.log("recent bets", myProfile.recentPredictionPdas);

    return (myProfile.recentPredictionPdas ?? []).slice(0, limit);
  }, [myProfile, limit]);

  // monotonically increasing request id to ignore stale responses
  const reqIdRef = useRef(0);


  useEffect(() => {
    // ✅ IMPORTANT: if profile not ready, don't leave UI stuck "loading"
    if (!myProfile || !versionKey) {
      setVK(null);
      setPredictions([]);
      setError(null);
      setLoading(false);
      return;
    }


    setVK(versionKey);

    if (recentPredictionPdas.length === 0) {
      console.log("no recent bets");
      setPredictions([]);
      setError(null);
      setLoading(false);
      return;
    }

    const myReqId = ++reqIdRef.current;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const predictions = await withTimeout(
        fetchRecentPredictionsOneShot(connection, recentPredictionPdas),
        12_000
      );

      if (cancelled || reqIdRef.current !== myReqId) return;

      setPredictions(predictions);
      setError(null);
    })()
      .catch((e: unknown) => {
        if (cancelled || reqIdRef.current !== myReqId) return;
        setError(e instanceof Error ? e.message : "Failed to load recent bets");
      })
      .finally(() => {
        if (cancelled || reqIdRef.current !== myReqId) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connection, myProfile, versionKey, limit, setVK, setLoading, setError, refreshNonce, recentPredictionPdas, setPredictions]);
}