import { atom } from "jotai";
import { ResolvedGameSummary, ResolvedGameUIDisplay } from '@/state/resolved-game-types';


export type ResolvedGameKey = `${string}:${number}`; // `${gameEpoch}:${tier}`

export const resolvedGamesByKeyAtom = atom<Map<ResolvedGameKey, ResolvedGameSummary>>(
  new Map()
);

export const upsertResolvedGamesAtom = atom(
  null,
  (get, set, items: Record<string, ResolvedGameSummary>) => {
    const next = new Map(get(resolvedGamesByKeyAtom));
    for (const [k, v] of Object.entries(items)) {
      next.set(k as ResolvedGameKey, v);
    }
    set(resolvedGamesByKeyAtom, next);
  }
);

// For live completed resolve game display
export const latestResolvedGameDisplayAtom = atom<ResolvedGameUIDisplay | null>(null);