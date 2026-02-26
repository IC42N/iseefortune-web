export type ResolvedGameExtrasApiResp = {
  epoch: number;
  tier: number;
  full: { key: string; json: unknown };
  tickets: { key: string; json: unknown } | null;
};

export async function fetchResolvedGameExtrasViaApi(args: {
  epoch: bigint;
  tier: number;
}): Promise<ResolvedGameExtrasApiResp> {
  const u = new URL("/api/resolved-game-extras", window.location.origin);
  u.searchParams.set("epoch", args.epoch.toString());
  u.searchParams.set("tier", String(args.tier));

  const r = await fetch(u.toString(), { cache: "no-store" });
  if (!r.ok) throw new Error(`extras fetch failed (${r.status})`);

  return (await r.json()) as ResolvedGameExtrasApiResp;
}