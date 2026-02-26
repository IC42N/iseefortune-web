import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

import bs58 from 'bs58';

export const runtime = "nodejs";


const PROGRAM_ID_STR = process.env.PROGRAM_ID;
if (!PROGRAM_ID_STR) throw new Error("Missing PROGRAM_ID");
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

const RPC_URL = process.env.MAINNET_RPC_URL;
if (!RPC_URL) throw new Error("Missing MAINNET_RPC_URL");

const PLAYER_OFFSET = 24;
const BET_DATA_SIZE = 111;

function readU64LE(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

function readI64LE(buf: Buffer, offset: number): bigint {
  return buf.readBigInt64LE(offset);
}

function readPubkeyBase58(buf: Buffer, offset: number): string {
  const bytes = buf.subarray(offset, offset + 32);
  return bs58.encode(bytes);
}

type BetDecoded = {
  betPda: string;

  game_epoch: string;
  epoch: string;
  player: string;
  tier: number;
  number: number;
  lamports: string;
  changed_count: number;
  placed_slot: string;
  placed_at_ts: string;
  last_updated_at_ts: string;
};

function decodeBetAccount(data: Buffer, betPda: PublicKey): BetDecoded {
  if (data.length !== BET_DATA_SIZE) {
    throw new Error(`Unexpected Bet data size: ${data.length}, expected ${BET_DATA_SIZE}`);
  }

  let o = 0;

  // 0..8 discriminator (skip)
  o += 8;

  const game_epoch = readU64LE(data, o); o += 8;
  const epoch = readU64LE(data, o); o += 8;

  const player = readPubkeyBase58(data, o); o += 32;

  const tier = data.readUInt8(o); o += 1;
  const number = data.readUInt8(o); o += 1;

  const lamports = readU64LE(data, o); o += 8;

  const changed_count = data.readUInt8(o); o += 1;

  const placed_slot = readU64LE(data, o); o += 8;

  const placed_at_ts = readI64LE(data, o); o += 8;
  const last_updated_at_ts = readI64LE(data, o); o += 8;

  // _reserved: [u8; 20] (skip)
  // o += 20;

  return {
    betPda: betPda.toBase58(),
    game_epoch: game_epoch.toString(),
    epoch: epoch.toString(),
    player,
    tier,
    number,
    lamports: lamports.toString(),
    changed_count,
    placed_slot: placed_slot.toString(),
    placed_at_ts: placed_at_ts.toString(),
    last_updated_at_ts: last_updated_at_ts.toString(),
  };
}


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ ok: false, error: "wallet is required" }, { status: 400 });
  }

  if (!RPC_URL) {
    return NextResponse.json({ ok: false, error: "RPC URL is required" });
  }

  let player: PublicKey;
  try {
    player = new PublicKey(wallet);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid wallet" }, { status: 400 });
  }

  const connection = new Connection(RPC_URL, "confirmed");

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      { memcmp: { offset: PLAYER_OFFSET, bytes: player.toBase58() } },
      { dataSize: BET_DATA_SIZE },
    ],
  });

  const bets: BetDecoded[] = [];
  for (const a of accounts) {
    try {
      bets.push(decodeBetAccount(a.account.data, a.pubkey));
    } catch {
      // If you ever change Bet layout, this prevents one bad decode from breaking everything.
      // You can log if you want.
    }
  }

  // Example sort: newest first by placed_slot (string -> BigInt)
  bets.sort((x, y) => {
    const a = BigInt(x.placed_slot);
    const b = BigInt(y.placed_slot);
    return a === b ? 0 : a > b ? -1 : 1;
  });

  return NextResponse.json(
    { ok: true, wallet: player.toBase58(), count: bets.length, bets },
    { status: 200 }
  );
}