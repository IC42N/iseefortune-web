import type { PlayerProfileStats } from "@/state/player-profile-atoms";
import { isPlayerGenesisPlayer, type LevelProgress, xpToLevel } from "@/utils/profile";

type ViewedProfileApiResponse = {
  ok: boolean;
  handle: string;
  profile: { xp: string; tickets: number; firstEpoch: string } | null;
  stats: PlayerProfileStats | null;
  error?: string;
};

export type ViewedProfileReady = {
  profile: {
    xp: bigint;
    level: LevelProgress;
    tickets: number;
    firstEpoch: bigint;
    isGenesis: boolean;
  } | null;
  stats: PlayerProfileStats | null;
};

export async function fetchViewedProfileByHandle(
  handle: string
): Promise<ViewedProfileReady | null> {
  const h = handle.trim().toUpperCase();
  if (!h) return null;

  const res = await fetch(`/api/viewed-profile?handle=${encodeURIComponent(h)}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await res.json()) as ViewedProfileApiResponse;

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error ?? "Failed to fetch viewed profile");
  }

  if (!json.profile) {
    return { profile: null, stats: json.stats ?? null };
  }

  const xp = BigInt(json.profile.xp);
  const firstEpoch = BigInt(json.profile.firstEpoch);

  return {
    profile: {
      xp,
      level: xpToLevel(xp),
      tickets: json.profile.tickets,
      firstEpoch,
      isGenesis: isPlayerGenesisPlayer(firstEpoch),
    },
    stats: json.stats ?? null,
  };
}