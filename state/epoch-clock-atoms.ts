import { atom } from "jotai";

//Derived UI clock
//These exist for smooth clock animation + notices that are UI conveniences, not chain truth.
//These are derived / UI plumbing, so they can be reset often.

export type EpochPhase =
  | "early"
  | "mid"
  | "late"
  | "lastHour"
  | "locked"
  | "resolving"
  | "post";

export type EpochClock = {
  epoch: number;
  absoluteSlot: number;
  slotsInEpoch: number;

  endSlot: number;

  remainingSlots: number;
  remainingSec: number | null;

  progress: number; // 0..1 elapsed
  phase: EpochPhase;

  color: string; // used by ring + badges
};

// derived, throttled, “pretty” clock state (progress, remainingSec, phase, color)
export const epochClockAtom = atom<EpochClock | null>(null);

/** UI / event plumbing */
export const epochNoticesAtom = atom<Array<{ id: string; text: string; ts: number }>>([]);
export const epochResultsModalAtom = atom<{ open: boolean; epoch: number | null }>({ open: false, epoch: null });

/** Track markers so they fire only once per epoch */
export const epochMarkersFiredAtom = atom<Set<string>>(new Set<string>());