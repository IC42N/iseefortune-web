import { PublicKey } from "@solana/web3.js";
import { IC42N_ACCOUNTS_CODER } from "@/solana/anchor-client";
import type { PlayerProfileReady } from "@/state/player-profile-atoms";
import { toBigInt } from "@/utils/decoder";
import { mod } from '@/utils/betting';
import { generateHandleFromWalletPubKey, getRank, isPlayerGenesisPlayer, xpToLevel } from '@/utils/profile';
import { clampInt } from '@/utils/number_helper';


const RECENT_BETS_CAPACITY = 40;


// Temporary type for processing (IDL fields are snake_case)
type AnchorPlayerProfileUnknown = {
  player: PublicKey;
  bump: unknown;
  tickets_available: unknown;        // u32  -> number
  total_bets: unknown;               // likely u64 -> bigint
  total_lamports_wagered: unknown;   // likely u64 -> bigint
  last_played_epoch: unknown;        // u64 -> bigint
  last_played_tier: unknown;         // u8  -> number
  last_played_timestamp: unknown;    // i64 -> bigint (or number if you choose, but bigint is safer)
  xp_points: unknown;                // u64 -> bigint
  recent_bets: unknown;               // 32 * 40 = 1280 bytes, 40 slots of 32 bytes each
  recent_bets_len: unknown;          // u16  -> number
  recent_bets_head: unknown;          // u16  -> number
  locked_until_epoch: unknown;        // u64  -> bigint
  first_played_epoch: unknown;        // u64  -> bigint
  _reserved: unknown;
};


/**
 * Your contract: head = next index to write.
 * So newest is at (head - 1), then walk backwards.
 */
function decodeRecentBetPdasNewestFirst(raw: {
  recent_bets: unknown;
  recent_bets_len: number;
  recent_bets_head: number;
}): PublicKey[] {
  const len = clampInt(raw.recent_bets_len, 0, RECENT_BETS_CAPACITY);
  const head = mod(raw.recent_bets_head, RECENT_BETS_CAPACITY);

  // Anchor gives [PublicKey; 40] as PublicKey[]
  if (Array.isArray(raw.recent_bets) && raw.recent_bets.length) {
    //console.log("Player Profile decode: Gives pubkeys")
    const arr = raw.recent_bets as Array<PublicKey | null | undefined>;
    const out: PublicKey[] = [];

    for (let i = 0; i < len; i++) {
      const idx = mod(head - 1 - i, RECENT_BETS_CAPACITY);
      const pk = arr[idx];
      if (pk) out.push(pk);
    }
    return out;
  }

  //console.log("Player Profile decode: Gives bytes");
  return [];
}



/**
 * Decode PlayerProfile PDA bytes into PlayerProfileReady (UI shape).
 *
 * Accept Uint8Array so it works in browser (Next.js client) and Node.
 * (Buffer is a Uint8Array subclass, so Node usage still works too.)
 */
export function decodePlayerProfile(pubkey: PublicKey, data: Buffer): PlayerProfileReady {
  const raw = IC42N_ACCOUNTS_CODER.decode("PlayerProfile", data) as AnchorPlayerProfileUnknown;

  const recentLen = Number(raw.recent_bets_len);
  const recentHead = Number(raw.recent_bets_head);

  const recentPredictionPdas: PublicKey[] = decodeRecentBetPdasNewestFirst({
    recent_bets: raw.recent_bets,
    recent_bets_len: recentLen,
    recent_bets_head: recentHead,
  });

  const recentBetsVersionKey =  recentLen != 0 ? `${recentLen}:${recentHead}` : 'none';

  const handle = generateHandleFromWalletPubKey(raw.player.toBase58());
  const xp = toBigInt(raw.xp_points);

  const level = xpToLevel(xp);

  // First played epoch
  const firstEpochPlayed = toBigInt(raw.first_played_epoch)

  // Is genesis player?
  const isGenesis = isPlayerGenesisPlayer(firstEpochPlayed);

  const rank = getRank(isGenesis, level.level);

  return {
    pubkey,
    player: raw.player,
    handle,

    // u32 -> number (safe)
    tickets: Number(raw.tickets_available),

    // u64/i64 -> bigint (use your helpers to support BN/number/bigint)
    totalGames: toBigInt(raw.total_bets),
    lastGame: toBigInt(raw.last_played_epoch),

    // u8 -> number
    lastTier: Number(raw.last_played_tier),

    // u64 -> bigint
    xp: xp,

    recentPredictionPdas,
    recentPredictionPdaStrings: recentPredictionPdas.map((k) => k.toBase58()),
    lockedUntilEpoch: toBigInt(raw.locked_until_epoch),
    recentBetsVersionKey: recentBetsVersionKey,
    firstPlayedEpoch: firstEpochPlayed,
    isGenesis: isGenesis,
    rank: rank,
    level: xpToLevel(xp),
  };
}