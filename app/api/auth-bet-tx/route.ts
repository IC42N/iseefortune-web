import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const tier = body?.tier;
  const hasTier = typeof tier === "number" && tier >= 1 && tier <= 5;
  if (!hasTier) {
    return NextResponse.json({ ok: false, error: "missing tier" }, { status: 400 });
  }

  const hasTxSig = typeof body?.tx_sig === "string" && body.tx_sig.length >= 10;
  const hasHandle = typeof body?.handle === "string" && body.handle.length >= 6;

  // Must provide one of the two
  if (!hasTxSig && !hasHandle) {
    return NextResponse.json(
      { ok: false, error: "missing tx_sig or handle" },
      { status: 400 }
    );
  }

  const res = await fetch(process.env.AUTH_LAMBDA_URL!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": process.env.INTERNAL_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}