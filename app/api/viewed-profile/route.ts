import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getPlayerStatsByHandle } from "@/server/getPlayerStatsByHandle";
import { decodePlayerProfileServer } from "@/solana/server/decode/player-profile.server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const RPC_URL = process.env.MAINNET_RPC_URL;
if (!RPC_URL) throw new Error("Missing MAINNET_RPC_URL");

const PROGRAM_ID_STR = process.env.PROGRAM_ID;
if (!PROGRAM_ID_STR) throw new Error("Missing PROGRAM_ID");
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

const connection = new Connection(RPC_URL, "confirmed");

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handleRaw = searchParams.get("handle") ?? "";
    const handle = handleRaw.trim().toUpperCase();
    if (!handle) {
      return NextResponse.json({ ok: false, error: "Missing handle" }, { status: 400 });
    }

    // 1) Dynamo stats (contains player pubkey, but we won't return it)
    const stats = await getPlayerStatsByHandle(handle);
    if (!stats) {
      return NextResponse.json({ ok: true, handle, profile: null, stats: null });
    }

    // 2) Fetch on-chain profile PDA (server-side only)
    const playerPk = new PublicKey(stats.player);
    const profilePda = getProfilePdaLocal(playerPk);

    const info = await connection.getAccountInfo(profilePda, { commitment: "confirmed" });

    let profile: { xp: string; tickets: number; firstEpoch: string } | null = null;

    if (info?.data) {
      const decoded = decodePlayerProfileServer(profilePda, info.data);
      profile = {
        xp: decoded.xp.toString(),
        tickets: decoded.tickets,
        firstEpoch: decoded.firstPlayedEpoch.toString(),
      };
    }

    // 3) Safe stats (strip pubkey)
    const safeStats = {
      rank: stats.rank,
      createdAt: stats.createdAt,
      updatedAt: stats.updatedAt,

      lastPlayedTier: stats.lastPlayedTier,
      lastResult: stats.lastResult,
      lastResultEpoch: stats.lastResultEpoch,

      currentWinStreak: stats.currentWinStreak,
      bestWinStreak: stats.bestWinStreak,
      totalCorrect: stats.totalCorrect,
      totalWrong: stats.totalWrong,

      totalWageredLamports: stats.totalWageredLamports,
      totalPayoutLamports: stats.totalPayoutLamports,
    };

    return NextResponse.json({ ok: true, handle, profile, stats: safeStats });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

// Must do it here so we can get PROGRAM ID FROM SERVER
export function getProfilePdaLocal(player: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), player.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}