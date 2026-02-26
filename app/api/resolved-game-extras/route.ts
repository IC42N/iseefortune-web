import { NextResponse } from "next/server";
import { getObjectText, isNotFoundError } from '@/app/api/_shared/s3-json';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function GET(req: Request) {
  const url = new URL(req.url);

  const epochStr = url.searchParams.get("epoch");
  const tierStr = url.searchParams.get("tier");

  if (!epochStr || !tierStr) {
    return NextResponse.json({ error: "Missing epoch or tier" }, { status: 400 });
  }

  const epoch = Number(epochStr);
  const tier = Number(tierStr);

  if (!Number.isFinite(epoch) || epoch < 0) {
    return NextResponse.json({ error: "Invalid epoch" }, { status: 400 });
  }
  if (!Number.isFinite(tier) || tier < 1 || tier > 5) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const Bucket = process.env.RESOLVED_GAMES_BUCKET;
  if (!Bucket) {
    return NextResponse.json({ error: "Missing RESOLVED_GAMES_BUCKET" }, { status: 500 });
  }

  const fullKey = `resolved-games/${epoch}/${tier}.json`;
  const ticketsKey = `resolved-games/${epoch}/${tier}.tickets.json`;

  try {
    const [fullRes, ticketsRes] = await Promise.allSettled([
      getObjectText(Bucket, fullKey),
      getObjectText(Bucket, ticketsKey),
    ]);

    // Full JSON is required
    if (fullRes.status === "rejected") {
      return NextResponse.json(
        {
          error: "Full results file not found or unreadable",
          key: fullKey,
          detail: fullRes.reason instanceof Error ? fullRes.reason.message : String(fullRes.reason),
        },
        { status: 404 }
      );
    }

    let fullJson: unknown;
    try {
      fullJson = JSON.parse(fullRes.value);
    } catch {
      return NextResponse.json(
        { error: "Full results JSON parse failed", key: fullKey },
        { status: 502 }
      );
    }

    // Tickets are optional
    let ticketsJson: unknown | null = null;
    if (ticketsRes.status === "fulfilled") {
      try {
        ticketsJson = JSON.parse(ticketsRes.value);
      } catch {
        // keep null if malformed; don't block the whole response
        ticketsJson = null;
      }
    } else if (ticketsRes.status === "rejected") {
      // If it's truly missing, keep null. If it's another error, you can surface it.
      if (!isNotFoundError(ticketsRes.reason)) {
        // Non-notfound error (permissions, etc.)
        ticketsJson = null;
      }
    }

    return NextResponse.json(
      {
        epoch,
        tier,
        full: {
          key: fullKey,
          json: fullJson,
        },
        tickets: ticketsJson
          ? { key: ticketsKey, json: ticketsJson }
          : null,
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "S3 fetch failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}