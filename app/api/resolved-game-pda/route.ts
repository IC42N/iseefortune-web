// app/api/resolved-game-pda/route.ts
import { NextResponse } from "next/server";
import { pickRpc } from "../_shared/solana-rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RpcError = { code: number; message: string; data?: unknown };

type RpcAccountInfoValue = {
  lamports: number;
  owner: string;
  executable: boolean;
  rentEpoch: number;
  data: [string, "base64"];
  space?: number;
};

type RpcAccountInfoResult = {
  context: { slot: number };
  value: RpcAccountInfoValue | null;
};

type RpcAccountInfoSuccess = {
  jsonrpc: "2.0";
  id: string | number | null;
  result: RpcAccountInfoResult;
};

type RpcAccountInfoFailure = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: RpcError;
};

type RpcAccountInfoResp = RpcAccountInfoSuccess | RpcAccountInfoFailure;

function mustParseTier(tierStr: string | null): number | null {
  if (!tierStr) return null;
  const n = Number(tierStr);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

// lightweight base58-ish check (enough to catch null/empty/obviously wrong)
function isLikelyBase58Pubkey(s: string): boolean {
  if (s.length < 32 || s.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const epochStr = (url.searchParams.get("epoch") ?? "").trim();
    const tier = mustParseTier(url.searchParams.get("tier"));
    const pda = (url.searchParams.get("pda") ?? "").trim();
    const cluster = (url.searchParams.get("cluster") ?? "mainnet").trim();

    if (!epochStr) {
      return NextResponse.json({ ok: false, error: "Missing epoch" }, { status: 400 });
    }
    // Only validation (you don't use epoch in this route)
    try {
      const epoch = BigInt(epochStr);
      if (epoch < 0n) return NextResponse.json({ ok: false, error: "epoch must be >= 0"}, {status: 400});
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid epoch" }, { status: 400 });
    }

    if (tier == null) {
      return NextResponse.json({ ok: false, error: "Missing or invalid tier" }, { status: 400 });
    }

    if (!pda) {
      return NextResponse.json({ ok: false, error: "Missing pda" }, { status: 400 });
    }
    if (!isLikelyBase58Pubkey(pda)) {
      return NextResponse.json(
        { ok: false, error: "Invalid pda (expected base58 pubkey)" },
        { status: 400 }
      );
    }

    const upstream = pickRpc(cluster);

    const payload = {
      jsonrpc: "2.0",
      id: "resolved-game",
      method: "getAccountInfo",
      params: [pda, { encoding: "base64" as const }],
    };

    let r: Response;
    try {
      r = await fetch(upstream, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { ok: false, error: "RPC fetch failed", detail, upstream },
        { status: 502 }
      );
    }

    const text = await r.text();

    let json: RpcAccountInfoResp;
    try {
      json = JSON.parse(text) as RpcAccountInfoResp;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "RPC did not return JSON",
          upstream,
          status: r.status,
          bodyPreview: text.slice(0, 300),
        },
        { status: 502 }
      );
    }

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: "RPC returned non-200", upstream, status: r.status, detail: json },
        { status: 502 }
      );
    }

    if ("error" in json) {
      return NextResponse.json(
        { ok: false, error: "RPC error", upstream, detail: json.error },
        { status: 502 }
      );
    }

    const value = json.result.value;
    if (!value) {
      return NextResponse.json(
        { ok: true, pda, found: false, slot: json.result.context.slot },
        { status: 200, headers: { "cache-control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        pda,
        found: true,
        slot: json.result.context.slot,
        owner: value.owner,
        lamports: value.lamports,
        executable: value.executable,
        rentEpoch: value.rentEpoch,
        dataBase64: value.data[0],
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}