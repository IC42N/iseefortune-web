import { Connection } from "@solana/web3.js";

// RPC for sending transactions only
const SEND_RPC = process.env.NEXT_PUBLIC_SEND_RPC;
if (!SEND_RPC) {
  throw new Error("Missing NEXT_PUBLIC_SEND_RPC");
}
export const sendConnection = new Connection(SEND_RPC, "confirmed");