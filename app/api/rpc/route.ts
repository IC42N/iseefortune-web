// app/api/rpc/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // avoid Next caching
export const revalidate = 0;

const ALLOWED = new Set([
  "getMinimumBalanceForRentExemption",
  "getBalance",
  "getBalanceAndContext",
  "getRecentPerformanceSamples",
  "getAccountInfo",
  "getMultipleAccounts",
  "getLatestBlockhash",
  "getEpochInfo",
  "getSlot",
  "getBlockHeight",
  "getProgramAccounts",
  "getSignaturesForAddress",
  "getTransaction",
  "sendTransaction",
  "simulateTransaction",
  "getSignatureStatuses",     // <-- REQUIRED for confirmTransaction
  "getBlockTime",             // sometimes used by explorers/UX
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin");

  // Allowlist (prod + local dev)
  const allowed = new Set<string>([
    "https://iseefortune.com",
    "https://www.iseefortune.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  // If Origin is present and allowed, echo it (required for credential-less CORS too).
  // If Origin is missing (server-to-server), you can omit CORS entirely,
  // but returning a safe default doesn't hurt for your use-case.
  const allowOrigin =
    origin && allowed.has(origin) ? origin : "https://iseefortune.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers":
      req.headers.get("access-control-request-headers") ?? "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}


// IMPORTANT: handle preflight
export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function pickRpc(cluster: string | null) {
  const c = cluster === "mainnet" || cluster === "mainnet-beta" ? "mainnet" : "devnet";
  const url = c === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.DEVNET_RPC_URL;
  return url ?? (c === "mainnet"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com");
}


export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const upstream = pickRpc(searchParams.get("cluster"));

    const body = await req.text();

    let payload;
    try {
      payload = JSON.parse(body);

      const isBatch = Array.isArray(payload);
      const items = isBatch ? payload : [payload];
      for (const it of items) {
        const method = it?.method as string | undefined;
        if (!method || !ALLOWED.has(method)) {
          return NextResponse.json(
            { error: "RPC method not allowed", method },
            { status: 403, headers: { ...corsHeaders(req), "cache-control": "no-store" } }
          );
        }
      }

      const first = isBatch ? payload[0] : payload;
      if (!first?.method || !first?.jsonrpc) {
        return NextResponse.json(
          { error: "Invalid RPC payload" },
          { status: 400, headers: { ...corsHeaders(req), "cache-control": "no-store" } }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400, headers: { ...corsHeaders(req), "cache-control": "no-store" } }
      );
    }

    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
        "accept": req.headers.get("accept") ?? "application/json",
      },
      body,
      cache: "no-store",
    });

    const text = await r.text();
    const contentType = r.headers.get("content-type") ?? "application/json";

    return new NextResponse(text, {
      status: r.status,
      headers: {
        ...corsHeaders(req),
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "RPC proxy failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502, headers: { ...corsHeaders(req), "cache-control": "no-store" } }
    );
  }
}