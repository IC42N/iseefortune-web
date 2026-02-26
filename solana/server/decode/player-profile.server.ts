import "server-only";
import { PublicKey } from "@solana/web3.js";
import { IC42N_ACCOUNTS_CODER } from "@/solana/server/idl-coder.server";
import type { PlayerProfileReady } from "@/state/player-profile-atoms";
import { toBigInt } from "@/utils/decoder";
import { generateHandleFromWalletPubKey, getRank, isPlayerGenesisPlayer, xpToLevel } from '@/utils/profile';

export function decodePlayerProfileServer(pubkey: PublicKey, data: Buffer): PlayerProfileReady {
  const raw = IC42N_ACCOUNTS_CODER.decode("PlayerProfile", data);
  const handle = generateHandleFromWalletPubKey(raw.player.toBase58());

  // Convert XP to bigint once, then derive level
  const xp = toBigInt(raw.xp_points);
  const level = xpToLevel(xp);
  const isGenesis = isPlayerGenesisPlayer(raw.first_played_epoch);
  const rank = getRank(isGenesis, level.level);


  return {
    pubkey,
    player: raw.player,
    handle,
    tickets: Number(raw.tickets_available),
    totalGames: toBigInt(raw.total_bets),
    lastGame: toBigInt(raw.last_played_epoch),
    lastTier: Number(raw.last_played_tier),
    xp,
    recentPredictionPdas: [],
    recentPredictionPdaStrings: [],
    lockedUntilEpoch: toBigInt(raw.locked_until_epoch),
    recentBetsVersionKey: "server",
    firstPlayedEpoch: toBigInt(raw.first_played_epoch),
    isGenesis: isGenesis,
    rank: rank,
    level,
  };
}