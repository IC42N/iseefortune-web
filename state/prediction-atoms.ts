import { PublicKey } from "@solana/web3.js";
import { atom } from "jotai";
import { atomWithReset, RESET } from "jotai/utils";

import { selectedTierAtom } from "@/state/tier-atoms";
import { liveFeedDecodedAtom } from "@/state/live-feed-atoms";
import { myPlayerAtom } from "@/state/player-profile-atoms";

/**
 * ------------------------------------------------------------
 * PredictionReady
 * ------------------------------------------------------------
 * Normalized, decoded Prediction account representation used by the UI.
 *
 * Notes:
 * - `gameEpoch` is the stable game identifier (LiveFeed.first_epoch_in_chain)
 * - There is at most ONE PredictionReady per wallet per (gameEpoch, tier)
 */
export type PredictionReady = {
  pubkey: PublicKey;

  // chain id (LiveFeed.first_epoch_in_chain)
  gameEpoch: bigint;

  // epoch in which prediction was placed/updated
  epoch: bigint;

  player: PublicKey;
  handle: string;

  tier: number;

  // coverage
  selectionsMask: number;   // u16
  selectionCount: number;   // u8
  predictionType: number;   // u8
  selections: number[];

  // Sol
  wagerTotalLamports: bigint;
  wagerLamportsPerNumber: bigint;

  changedCount: number;

  placedSlot: bigint;
  placedAtTs: bigint;
  lastUpdatedAtTs: bigint;

  hasClaimed: boolean;
  claimedAtTs: bigint;
};

/**
 * ------------------------------------------------------------
 * TierKey
 * ------------------------------------------------------------
 * `${gameEpoch}:${tier}`
 */
type TierKey = `${bigint}:${number}`;

/**
 * ------------------------------------------------------------
 * predictionsByTierAtom (internal)
 * ------------------------------------------------------------
 * Map<TierKey, Map<predictionPubkeyBase58, PredictionReady>>
 */
const predictionsByTierAtom = atom<Map<TierKey, Map<string, PredictionReady>>>(new Map());

/**
 * playerToPredictionByTierAtom
 * Map<TierKey, Map<playerBase58, predictionPubkeyBase58>>
 */
const playerToPredictionByTierAtom = atom<Map<TierKey, Map<string, string>>>(new Map());

/**
 * ------------------------------------------------------------
 * tierPredictionsAtom (read-only selector)
 * ------------------------------------------------------------
 */
export const tierPredictionsAtom = atom((get): Map<string, PredictionReady> => {
  const lf = get(liveFeedDecodedAtom);
  if (!lf?.first_epoch_in_chain) return new Map<string, PredictionReady>();

  const tier = get(selectedTierAtom);
  const key: TierKey = `${lf.first_epoch_in_chain}:${tier}`;

  return get(predictionsByTierAtom).get(key) ?? new Map<string, PredictionReady>();
});

export const lastPlayerPredictionsAtom = atom((get) => {
  const predsMap = get(tierPredictionsAtom);
  const list = Array.from(predsMap.values());

  list.sort((a, b) =>
    a.placedSlot === b.placedSlot ? 0 : a.placedSlot > b.placedSlot ? -1 : 1
  );

  return list;
});

export const topPlayerPredictionsAtom = atom((get) => {
  const predsMap = get(tierPredictionsAtom);
  const list = Array.from(predsMap.values());

  list.sort((a, b) =>
    a.wagerTotalLamports === b.wagerTotalLamports
      ? 0
      : a.wagerTotalLamports > b.wagerTotalLamports
        ? -1
        : 1
  );

  return list;
});

/**
 * ------------------------------------------------------------
 * clearTierPredictionsAtom
 * ------------------------------------------------------------
 */
export const clearTierPredictionsAtom = atom(
  null,
  (get, set, args: { gameEpoch: bigint; tier: number }) => {
    const key: TierKey = `${args.gameEpoch}:${args.tier}`;

    const predsOuter = new Map(get(predictionsByTierAtom));
    predsOuter.set(key, new Map());
    set(predictionsByTierAtom, predsOuter);

    const idxOuter = new Map(get(playerToPredictionByTierAtom));
    idxOuter.set(key, new Map());
    set(playerToPredictionByTierAtom, idxOuter);
  }
);

/**
 * ------------------------------------------------------------
 * upsertPredictionAtom
 * ------------------------------------------------------------
 * Called by prediction websocket subscription.
 *
 * Ensures one prediction per player per (gameEpoch, tier).
 */
export const upsertPredictionAtom = atom(
  null,
  (get, set, args: { gameEpoch: bigint; tier: number; prediction: PredictionReady }) => {
    const key: TierKey = `${args.gameEpoch}:${args.tier}`;

    const predictionPubkey58 = args.prediction.pubkey.toBase58();
    const player58 = args.prediction.player.toBase58();

    const predsOuter = new Map(get(predictionsByTierAtom));
    const tierMap = new Map(predsOuter.get(key) ?? []);

    const idxOuter = new Map(get(playerToPredictionByTierAtom));
    const idxTier = new Map(idxOuter.get(key) ?? []);

    // If we already had a prediction for this player, remove the old pubkey row
    const prevPk = idxTier.get(player58);
    if (prevPk && prevPk !== predictionPubkey58) {
      tierMap.delete(prevPk);
    }

    tierMap.set(predictionPubkey58, args.prediction);
    idxTier.set(player58, predictionPubkey58);

    predsOuter.set(key, tierMap);
    idxOuter.set(key, idxTier);

    set(predictionsByTierAtom, predsOuter);
    set(playerToPredictionByTierAtom, idxOuter);
  }
);

/**
 * Snapshot hydrator (RPC fetch)
 */
export const setTierPredictionsSnapshotAtom = atom(
  null,
  (get, set, args: { gameEpoch: bigint; tier: number; predictions: PredictionReady[] }) => {
    const key: TierKey = `${args.gameEpoch}:${args.tier}`;

    const predsOuter = new Map(get(predictionsByTierAtom));
    const tierMap = new Map<string, PredictionReady>();

    const idxOuter = new Map(get(playerToPredictionByTierAtom));
    const idxTier = new Map<string, string>(); // player -> predictionPubkey

    for (const p of args.predictions) {
      const pk58 = p.pubkey.toBase58();
      const player58 = p.player.toBase58();
      tierMap.set(pk58, p);
      idxTier.set(player58, pk58);
    }

    predsOuter.set(key, tierMap);
    idxOuter.set(key, idxTier);

    set(predictionsByTierAtom, predsOuter);
    set(playerToPredictionByTierAtom, idxOuter);
  }
);

/**
 * ------------------------------------------------------------
 * Hydration status (per tier)
 * ------------------------------------------------------------
 */
const predictionHydrationByTierAtom = atom<Map<TierKey, "idle" | "loading" | "ready" | "error">>(
  new Map()
);

export const isCheckingMyPredictionAtom = atom((get) => {
  const status = get(currentPredictionHydrationStatusAtom);
  return status === "idle" || status === "loading";
});

export const setPredictionHydrationStatusAtom = atom(
  null,
  (get, set, args: { gameEpoch: bigint; tier: number; status: "idle" | "loading" | "ready" | "error" }) => {
    const key: TierKey = `${args.gameEpoch}:${args.tier}`;
    const next = new Map(get(predictionHydrationByTierAtom));
    next.set(key, args.status);
    set(predictionHydrationByTierAtom, next);
  }
);

export const currentPredictionHydrationStatusAtom = atom((get) => {
  const lf = get(liveFeedDecodedAtom);
  if (!lf?.first_epoch_in_chain) return "idle" as const;

  const tier = get(selectedTierAtom);
  const key: TierKey = `${lf.first_epoch_in_chain}:${tier}`;

  return get(predictionHydrationByTierAtom).get(key) ?? ("idle" as const);
});

/**
 * ------------------------------------------------------------
 * My Recent Predictions (Profile ring buffer)
 * ------------------------------------------------------------
 */
export const myRecentPredictionsRefreshNonceAtom = atomWithReset(0);
export const myRecentPredictionsAtom = atomWithReset<PredictionReady[]>([]);
export const myRecentPredictionsVersionKeyAtom = atomWithReset<string | null>(null);
export const myRecentPredictionsLoadingAtom = atomWithReset(false);
export const myRecentPredictionsErrorAtom = atomWithReset<string | null>(null);

/**
 * My prediction for the selected tier
 */
export const myPredictionAtom = atom((get) => {
  const lf = get(liveFeedDecodedAtom);
  if (!lf?.first_epoch_in_chain) return null;

  const tier = get(selectedTierAtom);
  const myPlayer = get(myPlayerAtom);
  if (!myPlayer) return null;

  const key: TierKey = `${lf.first_epoch_in_chain}:${tier}`;

  const idxTier = get(playerToPredictionByTierAtom).get(key);
  const predPk58 = idxTier?.get(myPlayer.toBase58());
  if (!predPk58) return null;

  return get(predictionsByTierAtom).get(key)?.get(predPk58) ?? null;
});

/**
 * ------------------------------------------------------------
 * Viewed Recent Predictions (Profile modal)
 * ------------------------------------------------------------
 */
export const viewedRecentPredictionsAtom = atomWithReset<PredictionReady[]>([]);
export const viewedRecentPredictionsVersionKeyAtom = atomWithReset<string | null>(null);
export const viewedRecentPredictionsLoadingAtom = atomWithReset(false);
export const viewedRecentPredictionsErrorAtom = atomWithReset<string | null>(null);

/**
 * Clear caches when switching wallets/profiles
 */
export const resetPredictionWalletCacheAtom = atom(null, (_get, set) => {
  set(myRecentPredictionsRefreshNonceAtom, RESET);
  set(myRecentPredictionsAtom, RESET);
  set(myRecentPredictionsVersionKeyAtom, RESET);
  set(myRecentPredictionsLoadingAtom, RESET);
  set(myRecentPredictionsErrorAtom, RESET);

  set(viewedRecentPredictionsAtom, RESET);
  set(viewedRecentPredictionsVersionKeyAtom, RESET);
  set(viewedRecentPredictionsLoadingAtom, RESET);
  set(viewedRecentPredictionsErrorAtom, RESET);
});