// src/live/livefeed-diff.ts
import type { LiveFeedReady } from "@/state/live-feed-atoms";
import type { LiveFeedEvent } from "./livefeed-events";

function diffIndicesBigintArray(a: bigint[], b: bigint[]): number[] {
  const max = Math.max(a.length, b.length);
  const changed: number[] = [];
  for (let i = 0; i < max; i++) {
    const av = a[i] ?? 0n;
    const bv = b[i] ?? 0n;
    if (av !== bv) changed.push(i);
  }
  return changed;
}

export function diffLiveFeed(prev: LiveFeedReady, next: LiveFeedReady): {
  events: LiveFeedEvent[];
  epochChanged: boolean;
  potDeltaLamports: bigint;
  betsDelta: bigint;
  changedLamportsIndices: number[];
  changedBetsIndices: number[];
} {
  const events: LiveFeedEvent[] = [];

  const epochChanged = prev.epoch !== next.epoch || prev.first_epoch_in_chain !== next.first_epoch_in_chain;
  if (epochChanged) {
    events.push({ type: "EPOCH_CHANGED", prevEpoch: prev.epoch, nextEpoch: next.epoch });
  }

  const potDeltaLamports = next.total_lamports - prev.total_lamports;
  if (potDeltaLamports !== 0n) {
    events.push({ type: "POT_UPDATED", deltaLamports: potDeltaLamports });
  }

  const betsDelta = next.total_bets - prev.total_bets;
  if (betsDelta !== 0n) {
    events.push({ type: "BETS_UPDATED", deltaBets: betsDelta });
  }

  const changedLamportsIndices = diffIndicesBigintArray(prev.lamports_per_number, next.lamports_per_number);
  const changedBetsIndices = diffIndicesBigintArray(prev.bets_per_number, next.bets_per_number);

  if (changedLamportsIndices.length > 0 || changedBetsIndices.length > 0) {
    events.push({
      type: "DISTRIBUTION_UPDATED",
      changedLamportsIndices,
      changedBetsIndices,
    });
  }

  events.push({ type: "ANY_UPDATE" });

  return {
    events,
    epochChanged,
    potDeltaLamports,
    betsDelta,
    changedLamportsIndices,
    changedBetsIndices,
  };
}