import { atom } from "jotai";
import { ResolvedGameUI } from '@/state/resolved-game-types';

export type ResolvedGamePdaKey = `${string}:${number}`; // `${epoch}:${tier}`

export type ResolvedGamePdaEntry = {
  key: ResolvedGamePdaKey;
  epoch: bigint;
  tier: number;
  data: ResolvedGameUI;
};

export const resolvedGamePdaByKeyAtom = atom<Map<ResolvedGamePdaKey, ResolvedGamePdaEntry>>(
  new Map()
);

export const upsertResolvedGamePdaAtom = atom(
  null,
  (get, set, entry: ResolvedGamePdaEntry) => {
    const next = new Map(get(resolvedGamePdaByKeyAtom));
    next.set(entry.key, entry);
    set(resolvedGamePdaByKeyAtom, next);
  }
);

export const upsertManyResolvedGamePdaAtom = atom(
  null,
  (get, set, entries: ResolvedGamePdaEntry[]) => {
    const next = new Map(get(resolvedGamePdaByKeyAtom));
    for (const e of entries) next.set(e.key, e);
    set(resolvedGamePdaByKeyAtom, next);
  }
);