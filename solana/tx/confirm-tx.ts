import type { Connection, TransactionSignature } from "@solana/web3.js";

export async function confirmFinalized(args: {
  connection: Connection;
  signature: TransactionSignature;
}): Promise<void> {
  const { connection, signature } = args;
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, ...latest },
    "finalized"
  );
}