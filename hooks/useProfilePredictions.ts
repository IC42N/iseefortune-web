"use client";

import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import { useSelectedWalletAccount } from "@/solana/selected-wallet-account-jotai";
import {
  myRecentPredictionsAtom,
  myRecentPredictionsLoadingAtom,
  myRecentPredictionsErrorAtom,
  myRecentPredictionsRefreshNonceAtom,
} from "@/state/prediction-atoms";

/**
 * Read-only hook for the currently connected wallet's recent predictions
 * (pulled from PlayerProfile.recent_predictions or equivalent).
 */
export function useMyProfilePredictions() {
  const { publicKey } = useSelectedWalletAccount();
  const walletBase58 = publicKey?.toBase58() ?? null;

  const predictions = useAtomValue(myRecentPredictionsAtom);
  const loading = useAtomValue(myRecentPredictionsLoadingAtom);
  const error = useAtomValue(myRecentPredictionsErrorAtom);

  const bumpRefresh = useSetAtom(myRecentPredictionsRefreshNonceAtom);
  const refetch = useCallback(() => bumpRefresh((n) => n + 1), [bumpRefresh]);

  return { publicKey, walletBase58, predictions, loading, error, refetch };
}