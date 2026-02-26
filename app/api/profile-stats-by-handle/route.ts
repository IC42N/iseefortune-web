import { NextResponse } from "next/server";
import { getPlayerStatsByHandle } from "@/server/getPlayerStatsByHandle";

// Fetch the stats for a player by handle from DynamoDB.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get("handle");

    if (!handle) {
      return NextResponse.json(
        { ok: false, error: "Missing handle parameter" },
        { status: 400 }
      );
    }

    const stats = await getPlayerStatsByHandle(handle);

    return NextResponse.json({ ok: true, stats }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}