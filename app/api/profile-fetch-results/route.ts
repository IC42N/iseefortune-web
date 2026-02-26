import { NextResponse } from "next/server";
import { getObjectText, isNotFoundError } from "@/app/api/_shared/s3-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// -----------------------
// Types (minimal + accurate)
// -----------------------
type WinnerClaim = {
  index: number;
  player: string;
  payout_lamports: number;
  proof: string[];
};

type TicketRecipient = {
  player: string;
  placed_slot: number;
  lamports: number;
  rewarded: number; // count of tickets
};

type FullResolvedGameJson = {
  winners?: WinnerClaim[];
  ticket_awards?: TicketRecipient[]; // present in full.json (your schema)
};

type TicketsFileJson = {
  ticket_awards?: TicketRecipient[]; // present in tickets.json
};

type WinnerResponse = {
  index: number;
  payout_lamports: string;
  proof: string[];
} | null;

type TicketAwardResponse = {
  placed_slot: number;
  lamports: string;
  rewarded: number;
} | null;

function safeJsonParse(text: string): unknown {
  return JSON.parse(text);
}

function extractWinnerClaim(fullJson: unknown, wallet: string): WinnerResponse {
  const full = fullJson as FullResolvedGameJson | null;
  const winners = Array.isArray(full?.winners) ? full!.winners! : [];

  //Convert the full wallet string to the player handle. [IMPORTANT: LOWERCASE]
  const walletHandle = `${wallet.slice(0, 4)}${wallet.slice(-4)}`
  const w = winners.find((x) => x.player === walletHandle) ?? null;

  return w
    ? {
      index: w.index,
      payout_lamports: String(w.payout_lamports),
      proof: Array.isArray(w.proof) ? w.proof : [],
    }
    : null;
}

function extractTicketAward(fromJson: unknown, wallet: string): TicketAwardResponse {
  const obj = fromJson as TicketsFileJson | FullResolvedGameJson | null;
  const awards = Array.isArray(obj?.ticket_awards) ? obj!.ticket_awards! : [];
  const a = awards.find((x) => x.player === wallet) ?? null;

  return a
    ? {
      placed_slot: a.placed_slot,
      lamports: String(a.lamports),
      rewarded: a.rewarded,
    }
    : null;
}


// When getting profile stats, the epoch we are searching for is the actual epoch the resolved game was resolved at.
// Not the bet gameEpoch because that is the first epoch on chain. We need to make sure we pass the actual epoch the resolved game was resolved at.
export async function GET(req: Request) {
  const url = new URL(req.url);

  const epochStr = url.searchParams.get("epoch");
  const tierStr = url.searchParams.get("tier");
  const wallet = url.searchParams.get("wallet");

  if (!epochStr || !tierStr || !wallet) {
    return NextResponse.json({ error: "Missing epoch, tier, or wallet" }, { status: 400 });
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

  // Fetch both in parallel; tickets is optional.
  const [fullRes, ticketsRes] = await Promise.allSettled([
    getObjectText(Bucket, fullKey),
    getObjectText(Bucket, ticketsKey),
  ]);

  // Full is required
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
    fullJson = safeJsonParse(fullRes.value);
  } catch {
    return NextResponse.json({ error: "Full results JSON parse failed", key: fullKey }, { status: 502 });
  }

  // Tickets optional
  let ticketsJson: unknown | null = null;
  if (ticketsRes.status === "fulfilled") {
    try {
      ticketsJson = safeJsonParse(ticketsRes.value);
    } catch {
      ticketsJson = null;
    }
  } else if (ticketsRes.status === "rejected" && !isNotFoundError(ticketsRes.reason)) {
    // non-notfound errors are ignored for profile flow
    ticketsJson = null;
  }

  const winner = extractWinnerClaim(fullJson, wallet);

  // Prefer tickets.json if it exists; otherwise fallback to full.json.ticket_awards
  const ticketAward = ticketsJson
    ? extractTicketAward(ticketsJson, wallet)
    : extractTicketAward(fullJson, wallet);

  return NextResponse.json(
    {
      epoch,
      tier,
      wallet,
      winner,      // { index, payout_lamports, proof } | null
      ticketAward, // { placed_slot, lamports, rewarded } | null
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}