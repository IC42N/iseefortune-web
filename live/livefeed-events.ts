// src/live/livefeed-events.ts
export type LiveFeedEvent =
  | { type: "EPOCH_CHANGED"; prevEpoch: bigint; nextEpoch: bigint }
  | { type: "POT_UPDATED"; deltaLamports: bigint }
  | { type: "BETS_UPDATED"; deltaBets: bigint }
  | { type: "DISTRIBUTION_UPDATED"; changedLamportsIndices: number[]; changedBetsIndices: number[] }
  | { type: "PHASE_UPDATED" } // keep for future, if you add phase fields
  | { type: "ANY_UPDATE" };