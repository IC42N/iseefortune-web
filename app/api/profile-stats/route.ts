import { NextResponse } from "next/server";
import { getPlayerStats } from "@/server/getPlayerStats";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const player = searchParams.get("player");

    if (!player) {
      return NextResponse.json(
        { ok: false, error: "Missing player parameter" },
        { status: 400 }
      );
    }

    const stats = await getPlayerStats(player);

    return NextResponse.json(
      { ok: true, stats },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}