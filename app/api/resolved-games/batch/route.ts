import { NextResponse } from "next/server";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from '@/utils/dynamodb';
import { ResolvedGameSummary } from '@/state/resolved-game-types';


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TABLE = process.env.RESOLVED_GAMES_TABLE_NAME;

type ReqBody = {
  keys: { gameEpoch: string; tier: number }[];
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}


export async function POST(req: Request) {
  try {
    if (!TABLE) return NextResponse.json({ ok: false, error: "Missing RESOLVED_GAMES_TABLE_NAME" }, { status: 500 });

    const body = (await req.json()) as Partial<ReqBody>;
    const keys = body.keys ?? [];

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { ok: true, items: {} },
        { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    // BatchGet max is 100 keys per table per request.
    const slice = keys.slice(0, 100);

    // IMPORTANT:
    // - Do NOT coerce gameEpoch into a JS Number.
    // - Keep it as a numeric string so Dynamo marshalling stays exact.
    // - tier is safe as number (small).
    let requestKeys = slice.map((k) => ({
      gameEpoch: Number(k.gameEpoch),
      tier: Number(k.tier),
    }));

    const out: Record<string, ResolvedGameSummary> = {};

    // Retry UnprocessedKeys a few times (throttle / transient partials)
    const MAX_TRIES = 6;


    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      const cmd = new BatchGetCommand({
        RequestItems: {
          [TABLE]: {
            Keys: requestKeys,
            // Optional: ConsistentRead is supported on BatchGet for base table
            // (not GSIs). If you want maximum freshness:
            // ConsistentRead: true,
          },
        },
      });

      const res = await ddb.send(cmd);

      const items = res.Responses?.[TABLE] ?? [];
      for (const it of items) {

        //console.log("resolved-games/batch IN:", it);

        const key = `${String(it.gameEpoch)}:${Number(it.tier)}`;
        out[key] = {
          gameEpoch: String(it.gameEpoch), // First epoch in chain
          firstEpoch: String(it.firstEpoch),
          resolvedEpoch: String(it.resolvedEpoch),
          tier: Number(it.tier),
          winningNumber: Number(it.winningNumber),
          arweaveUrl: it.arweaveResultsUri ? String(it.arweaveResultsUri) : undefined,
          resolvedAt: it.createdAt ? String(it.createdAt) : undefined,
          blockhash: it.rngBlockhashBase58 ? String(it.rngBlockhashBase58) : undefined,
          netPotLamports: it.netPotLamports ? Number(it.netPotLamports) : undefined,
          signature: it.resolveTxSignature ? String(it.resolveTxSignature) : undefined,
          winnersCount: it.winnersCount ? Number(it.winnersCount) : undefined,
        };
      }

      // If nothing left unprocessed, we are done.
      const unprocessed = res.UnprocessedKeys?.[TABLE]?.Keys ?? [];
      if (unprocessed.length === 0) break;

      // Prepare for the next retry pass
      requestKeys = unprocessed as typeof requestKeys;

      // Exponential-ish backoff with a cap
      const backoff = Math.min(800, 80 * Math.pow(2, attempt - 1));
      await sleep(backoff);
    }

    //console.log("resolved-games/batch OUT:", out);

    return NextResponse.json(
      { ok: true, items: out },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("resolved-games/batch ERROR:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

}