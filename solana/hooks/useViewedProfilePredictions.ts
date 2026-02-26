"use client";

import { useAtomValue } from "jotai";
import { viewedRecentPredictionsAtom, viewedRecentPredictionsErrorAtom, viewedRecentPredictionsLoadingAtom } from '@/state/prediction-atoms';

export function useViewedProfilePredictions() {
  const predictions = useAtomValue(viewedRecentPredictionsAtom);
  const predictionsLoading = useAtomValue(viewedRecentPredictionsLoadingAtom);
  const errorLoadingPredictions = useAtomValue(viewedRecentPredictionsErrorAtom);
  return { predictions, predictionsLoading, errorLoadingPredictions };
}