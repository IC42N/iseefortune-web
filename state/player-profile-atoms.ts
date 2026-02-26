import { atom } from "jotai";
import { PublicKey } from '@solana/web3.js';
import { LevelProgress } from '@/utils/profile';
import { myPredictionAtom } from '@/state/prediction-atoms';


export type MyProfileHydration =
  | "idle"     // disconnected / no wallet set
  | "loading"  // wallet set, fetching profile
  | "ready"    // profile exists in cache
  | "missing"  // fetch completed, profile doesn't exist
  | "error";   // fetch failed

export const myProfileHydrationAtom = atom<MyProfileHydration>("idle");
export const myProfileHydrationErrorAtom = atom<string | null>(null);

/**
 * ============================================================================
 * PlayerProfileReady
 * ----------------------------------------------------------------------------
 * UI-ready representation of a decoded PlayerProfile PDA.
 *
 * - One profile per wallet (1:1)
 * - Cached client-side to avoid repeated RPC calls
 * - Used for:
 *   - ticket counts (change number)
 *   - player stats
 *   - UX gating (has tickets, has played before, etc.)
 * ============================================================================
 */
export type PlayerProfileReady = {
  pubkey: PublicKey;   // PlayerProfile PDA pubkey
  player: PublicKey;   // wallet pubkey (1:1)
  handle: string;      // Generated handle
  tickets: number;     // tickets_available
  totalGames: bigint;  // total bets placed (lifetime)
  lastGame: bigint;    // last played gameEpoch
  lastTier: number;    // last played tier
  xp: bigint;          // XP points
  recentPredictionPdas: PublicKey[];
  recentPredictionPdaStrings: string[];
  lockedUntilEpoch: bigint; // u64
  recentBetsVersionKey: string;
  firstPlayedEpoch: bigint;
  isGenesis: boolean;
  rank: {
    name: string,
    image: string,// r1.svg | r2.svg | r3.svg | r4.svg | r5.svg
  };
  level: LevelProgress;
};



export type PlayerProfileStats = {
  player: string; // base58
  rank: string;   // player rank
  createdAt: string; // ISO
  updatedAt: string; // ISO

  lastPlayedTier: number;
  lastResult: "CORRECT" | "WRONG" | "MISS" | "PUSH" | string;
  lastResultEpoch: number;

  currentWinStreak: number;
  bestWinStreak: number;

  totalCorrect: number;
  totalWrong: number;

  // keep as strings for safety, convert to bigint when needed
  totalWageredLamports: string;
  totalPayoutLamports: string;
};



export type ViewedProfilePublic = {
  xp: bigint;
  tickets: number;
  level: LevelProgress
} | null;



/**
 * ============================================================================
 * profileByPlayerAtom (internal cache)
 * ----------------------------------------------------------------------------
 * Map<playerBase58, PlayerProfileReady>
 *
 * Central cache for ALL loaded player profiles.
 * Shared by:
 * - connected wallet ("my profile")
 * - other players (leaderboards, feeds, etc.)
 *
 * This atom is NOT read directly by UI components.
 * Always access it via some derived selectors below.
 * ============================================================================
 */
export const playerProfilesAtom = atom<Map<string, PlayerProfileReady>>(new Map());

/**
 * ============================================================================
 * requestedPlayersAtom
 * ----------------------------------------------------------------------------
 * Set<playerBase58>
 *
 * Tracks which players we’ve already attempted to fetch.
 * Prevents refetch loops when rendering lists of bets / players.
 *
 * If a fetch fails, and you want a retry, unmark via
 * `unmarkPlayersRequestedAtom`.
 * ============================================================================
 */
const requestedPlayersAtom = atom<Set<string>>(new Set<string>());

/**
 * ============================================================================
 * upsertProfilesAtom (write-only)
 * ----------------------------------------------------------------------------
 * Inserts or replaces decoded profiles into the cache.
 *
 * Called by:
 * - useMyProfile()
 * - batched profile loaders for other players
 *
 * Safe to call repeatedly (idempotent).
 * ============================================================================
 */
export const upsertPlayerProfilesAtom = atom(
  null,
  (get, set, args: { profiles: PlayerProfileReady[] }) => {
    const next = new Map(get(playerProfilesAtom));
    for (const p of args.profiles) next.set(p.player.toBase58(), p);
    set(playerProfilesAtom, next);
  }
);
/**
 * ============================================================================
 * markPlayersRequestedAtom (write-only)
 * ----------------------------------------------------------------------------
 * Marks player pubkeys as "already requested".
 * Used to avoid duplicate RPC requests when rendering lists.
 * ============================================================================
 */
export const markPlayersRequestedAtom = atom(
  null,
  (get, set, args: { players: string[] }) => {
    const next = new Set(get(requestedPlayersAtom));
    for (const s of args.players) next.add(s);
    set(requestedPlayersAtom, next);
  }
);

/**
 * Read-only selector: Set<string>
 * Used by loaders to check if a player was already requested.
 */
export const requestedPlayersSetAtom = atom((get) =>
  get(requestedPlayersAtom)
);


/**
 * ============================================================================
 * unmarkPlayersRequestedAtom (write-only)
 * ----------------------------------------------------------------------------
 * Allows retrying profile fetches for specific players.
 * Useful after transient RPC failures.
 * ============================================================================
 */
export const unmarkPlayersRequestedAtom = atom(
  null,
  (get, set, args: { players: string[] }) => {
    const next = new Set(get(requestedPlayersAtom));
    for (const p of args.players) next.delete(p);
    set(requestedPlayersAtom, next);
  }
);



/**
 * ============================================================================
 * profileByPlayerPubkeyAtom (convenience selector)
 * ----------------------------------------------------------------------------
 * Returns a lookup function:
 *
 *   const profile = get(profileByPlayerPubkeyAtom)(playerPubkey)
 *
 * Useful when:
 * - rendering lists of bets
 * - mapping players → profiles in UI
 *
 * Note: returns null if profile not yet loaded.
 * ============================================================================
 */
export const getPlayerProfileAtom = atom((get) => {
  const map = get(playerProfilesAtom);
  return (player: PublicKey) => map.get(player.toBase58()) ?? null;
});


/**
 * ============================================================================
 * A) My profile (connected wallet)
 * ============================================================================
 */

export const myPlayerAtom = atom<PublicKey | null>(null);

/** myProfileAtom: PlayerProfileReady | null (from cache) */
export const myProfileAtom = atom((get) => {
  const me = get(myPlayerAtom);
  if (!me) return null;
  return get(playerProfilesAtom).get(me.toBase58()) ?? null;
});

/**
 * myProfileStatsAtom (Dynamo)
 * - Set by a client hook after /api/profile-stats fetch
 * - Keep separate from PDA data
 */
export const myProfileStatsAtom = atom<PlayerProfileStats | null>(null);

/** myProfileViewAtom: combined model for UI convenience */
export const myProfileViewAtom = atom((get) => ({
  profile: get(myProfileAtom),
  stats: get(myProfileStatsAtom),
}));


/**
 * ============================================================================
 * C) Viewed player profile (someone else)
 * ============================================================================
 */
export const viewedPlayerAtom = atom<PublicKey | null>(null);

/** viewedProfileStatsAtom: PlayerProfileStats | null (Dynamo) */
export const viewedProfileStatsAtom = atom<PlayerProfileStats | null>(null);

export const viewedProfilePublicAtom = atom<ViewedProfilePublic>(null);

export const viewedProfileViewAtom = atom((get) => ({
  profile: get(viewedProfilePublicAtom),
  stats: get(viewedProfileStatsAtom),
}));



/**
 * ============================================================================
 * hasBetOnGameAtom
 * ----------------------------------------------------------------------------
 * Derived boolean indicating whether the connected wallet
 * currently has an active bet for the selected gameEpoch + tier.
 *
 * Used for:
 * - PlayerBetBox state switching
 * - UX gating (place vs. update prediction)
 * ============================================================================
 */
export const hasPredictedOnGameAtom = atom((get) => !!get(myPredictionAtom));



/**
 * ============================================================================
 * clearProfilesCacheAtom (write-only)
 * ----------------------------------------------------------------------------
 * Clears ALL cached profiles and request markers.
 *
 * Used when:
 * - network / cluster changes
 * ============================================================================
 */
export const clearPlayerProfilesCacheAtom = atom(null, (_get, set) => {
  set(playerProfilesAtom, new Map());
  set(requestedPlayersAtom, new Set());
});

/**
 * ============================================================================
 * Clears ONLY wallet/session-scoped profile state.
 * Keeps the global playerProfiles cache for perf.
 *
 * Used when:
 * - player disconnects / wallet changes
 * ============================================================================

 */
export const resetProfileWalletCacheAtom = atom(null, (_get, set) => {
  // "my" scoped
  set(myProfileStatsAtom, null);

  // NEW: reset hydration state
  set(myProfileHydrationAtom, "idle");
  set(myProfileHydrationErrorAtom, null);

  // viewed/scoped UI state
  set(viewedPlayerAtom, null);
  set(viewedProfileStatsAtom, null);
  set(viewedProfilePublicAtom, null);
});