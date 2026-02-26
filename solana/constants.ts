import { PublicKey } from "@solana/web3.js";

// Program IDs are public; hardcode is simplest.
// If you insist on env, use NEXT_PUBLIC_PROGRAM_ID for client.
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "ic429goRDdS7BXEDYr2nZeAYMxtT6FL3AsB3sneaSu7"
);