import { decodeResolvedGameFromData } from "@/solana/decode/resolved-game";
import { getResolvedGamePda } from '@/solana/pdas';

type ResolvedGamePdaApiResp =
  | { found: false; pda: string; slot: number }
  | {
  found: true;
  pda: string;
  slot: number;
  owner: string;
  lamports: number;
  executable: boolean;
  rentEpoch: number;
  dataBase64: string;
};

export async function fetchResolvedGameDecoded(args: {
  epoch: bigint;
  tier: number;
  cluster?: "mainnet" | "devnet" | "mainnet-beta";
}) {
  const cluster = args.cluster ?? "mainnet";

  const pda = getResolvedGamePda(args.epoch, args.tier);


  const res = await fetch(
    `/api/resolved-game-pda?epoch=${args.epoch.toString()}&tier=${args.tier}&pda=${pda}&cluster=${cluster}`,
    { cache: "no-store" }
  );

  if (!res.ok) throw new Error(`resolved-game-pda HTTP ${res.status}`);

  const json = (await res.json()) as ResolvedGamePdaApiResp;

  if (!json.found) return null;

  const buf = Buffer.from(json.dataBase64, "base64");
  return decodeResolvedGameFromData(buf);
}