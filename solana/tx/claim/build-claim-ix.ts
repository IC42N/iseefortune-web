import type { AnchorProvider } from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import type { TransactionInstruction } from "@solana/web3.js";
import { getResolvedGamePda, getTreasuryPda } from '@/solana/pdas';
import type { Ic42nProgram } from '@/solana/anchor-client';
import { decodeProof } from '@/components/Profile/helpers/proof';

export type ClaimState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "sending" }
  | { status: "success" }
  | { status: "error"; message: string };


export type ClaimData = {
  epoch: bigint;
  tier: number;
  predictionPk: string;
  wallet: string;
  winnerIndex: number;
  payoutLamports: bigint;
  proof: string[]; // each element should decode to 32 bytes
};

export async function buildClaimIx(args: {
  program: Ic42nProgram;
  provider: AnchorProvider;
  data: ClaimData;
}): Promise<TransactionInstruction> {
  const { program, provider, data } = args;

  const player = provider.publicKey;
  if (!player) throw new Error("Wallet not connected.");

  if (data.tier < 0 || data.tier > 5) throw new Error("Invalid tierId.");
  if (data.winnerIndex == null) throw new Error("Missing winnerIndex.");
  if (!data.payoutLamports || data.payoutLamports <= 0n) throw new Error("Payout must be > 0.");

  if (data.proof == null) throw new Error("Missing proof field.");
  if (!Array.isArray(data.proof)) throw new Error("Invalid proof type.");

  const epoch = new BN(data.epoch.toString());
  const tier = data.tier;
  const index = data.winnerIndex;
  const payout = new BN(data.payoutLamports.toString());

  const proofBytes = decodeProof(data.proof); // ✅ each inner array is 32 bytes

  const gamePda = getResolvedGamePda(data.epoch, data.tier);
  const predictionPda = new PublicKey(data.predictionPk);
  const treasuryPda = getTreasuryPda();

  return program.methods
    .claimPrediction(epoch, tier, index, payout, proofBytes)
    .accountsStrict({
      game: gamePda,
      prediction: predictionPda,
      treasury: treasuryPda,
      claimer: player,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}