import { ResolvedGameSummary } from '@/state/resolved-game-types';

// Fetch all resolved games associated with a list of epoch and tier.
export async function fetchResolvedGamesForBets(keys: { gameEpoch: string; tier: number }[]) {
  const unique = Array.from(
    new Map(keys.map((k) => [`${k.gameEpoch}:${k.tier}`, k])).values()
  );

  // convert to the JSON-friendly
  // This is correctly using the game epoch, which is the first epoch of the game.
  // We do not want to query using the epoch the bet was created in.
  const payload = {
    keys: unique.map((k) => ({ gameEpoch: k.gameEpoch.toString(), tier: k.tier })),
  };

  // Fetching from DYNAMODB. Not PDA.
  const res = await fetch("/api/resolved-games/batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Failed to load resolved games");

  return json.items as Record<string, ResolvedGameSummary>;
}