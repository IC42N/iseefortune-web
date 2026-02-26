import { atom } from "jotai";
import { epochMarkersFiredAtom, epochNoticesAtom, epochClockAtom } from "@/state/epoch-clock-atoms";
import { latestResolvedGameDisplayAtom } from "@/state/resolved-game-atoms";

//This file is a “reset function” using Jotai.

//Optional signal that something should re-run. incrementing number = easy signal
export const epochResetCounterAtom = atom(0);

//Write-only atom that clears UI atoms
export const requestEpochResetAtom = atom(null, (get, set) => {
  set(epochResetCounterAtom, get(epochResetCounterAtom) + 1);

  // clear “per-epoch” UI state
  set(epochMarkersFiredAtom, new Set());
  set(epochNoticesAtom, []);
  set(epochClockAtom, null);

  // optional: keep resolved visible elsewhere, but clear “latest” if you only want it for the modal
  set(latestResolvedGameDisplayAtom, null);

});