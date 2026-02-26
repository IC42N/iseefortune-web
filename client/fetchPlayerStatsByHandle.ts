import type { PlayerProfileStats } from "@/state/player-profile-atoms";

// Fetch the stats for a player by handle from DynamoDB.
export async function fetchPlayerStatsByHandle(handle: string): Promise<PlayerProfileStats | null> {
  const h = handle.trim().toUpperCase();
  if (!h) return null;

  const res = await fetch(`/api/profile-stats-by-handle?handle=${encodeURIComponent(h)}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error ?? "Failed to fetch stats");
  }

  return (json.stats ?? null) as PlayerProfileStats | null;
}