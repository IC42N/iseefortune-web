import { atom } from "jotai";

export type SelectedEpoch =
  | { kind: "current" }
  | { kind: "epoch"; epoch: number };

const DEFAULT: SelectedEpoch = { kind: "current" };

export const selectedEpochAtom = atom<SelectedEpoch>(DEFAULT);