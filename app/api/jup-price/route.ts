import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");

  if (!ids) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const apiKey = process.env.JUP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing JUP_API_KEY" }, { status: 500 });
  }

  const url = `https://api.jup.ag/price/v3?ids=${encodeURIComponent(ids)}`;

  const r = await fetch(url, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
  });
}