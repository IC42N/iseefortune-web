import { atom } from "jotai";

import {
  lastPlayerPredictionsAtom,
  topPlayerPredictionsAtom,
} from "@/state/prediction-atoms";

import { playerProfilesAtom } from "@/state/player-profile-atoms";
import type { PredictionReady } from "@/state/prediction-atoms";

/**
 * ------------------------------------------------------------
 * PredictionRowVM
 * ------------------------------------------------------------
 * View-model used by bet/prediction tables.
 *
 * Extends PredictionReady with optional profile metadata.
 */
export type PredictionRowVM = PredictionReady & {
  xp?: bigint;
  totalGames?: bigint;
  isGenesis?: boolean;
  rank?: {
    name: string;
    image: string;
  };
};

/**
 * ------------------------------------------------------------
 * latestPredictionsWithProfilesAtom
 * ------------------------------------------------------------
 * Most recent predictions for the selected tier,
 * enriched with player profile metadata.
 */
export const latestPredictionsWithProfilesAtom = atom<PredictionRowVM[]>((get) => {
  const predictions = get(lastPlayerPredictionsAtom);
  const profiles = get(playerProfilesAtom);

  return predictions.map((p) => {
    const profile = profiles.get(p.player.toBase58());

    return {
      ...p,
      xp: profile?.xp,
      totalGames: profile?.totalGames,
      isGenesis: profile?.isGenesis ?? false,
      rank: profile?.rank ?? undefined,
    };
  });
});

/**
 * ------------------------------------------------------------
 * topPredictionsWithProfilesAtom
 * ------------------------------------------------------------
 * Top predictions (by wager size or other criteria),
 * enriched with player profile metadata.
 */
export const topPredictionsWithProfilesAtom = atom<PredictionRowVM[]>((get) => {
  const predictions = get(topPlayerPredictionsAtom);
  const profiles = get(playerProfilesAtom);

  return predictions.map((p) => {
    const profile = profiles.get(p.player.toBase58());

    return {
      ...p,
      xp: profile?.xp,
      totalGames: profile?.totalGames,
      isGenesis: profile?.isGenesis ?? false,
      rank: profile?.rank ?? undefined,
    };
  });
});