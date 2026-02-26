import type { AnchorProvider } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import type { TransactionInstruction } from "@solana/web3.js";
import type { BetModalState } from "@/state/betting-atom";
import {
  getConfigPda,
  getLiveFeedPda, getPredictionPda, getProfilePda,
  getTreasuryPda
} from '@/solana/pdas';
import type { Ic42nProgram } from "@/solana/anchor-client";
import { encodeChoice, normalizePicks, uiBetTypeToPredictionType } from '@/utils/place_prediction';

const U64_MAX = (1n << 64n) - 1n;

export async function buildAddLamportsIx(args: {
  program: Ic42nProgram;
  provider: AnchorProvider;
  state: BetModalState; // mode === "addLamports"
  allowedNumbers: readonly number[];
}): Promise<TransactionInstruction> {
  const { program, provider, state, allowedNumbers } = args;

  if (state.mode !== "addLamports") {
    throw new Error("buildAddLamportsIx called in non-addLamports mode.");
  }

  const player = provider.publicKey;
  if (!player) throw new Error("Wallet not connected.");

  const { tierId, lamportsPerNumber, numbers } = state.fields;
  const originalPerNumber = state.original?.lamportsPerNumber;

  if (originalPerNumber == null) {
    throw new Error("Missing original prediction snapshot for addLamports.");
  }

  // tier u8
  const tierU8 = Number(tierId);
  if (!Number.isInteger(tierU8) || tierU8 < 0 || tierU8 > 255) {
    throw new Error("Invalid tier.");
  }

  // IMPORTANT: program expects ADDITIONAL per-number lamports (delta), not the new per-number.
  const additionalPerNumber = lamportsPerNumber - originalPerNumber;

  if (additionalPerNumber <= 0n) {
    throw new Error("Choose how much to add.");
  }
  if (additionalPerNumber > U64_MAX) {
    throw new Error("Lamports amount exceeds u64.");
  }

  const additionalPerNumberU64 = new BN(additionalPerNumber.toString());


  // normalize picks
  const uiBetType = state.fields.betType; // 0|1|2|3
  const picks = normalizePicks({ picks: numbers, allowedNumbers });
  if (picks.length === 0) throw new Error("Pick a number first.");

  // map UI -> on-chain prediction_type
  const predictionTypeU8 = uiBetTypeToPredictionType({
    uiBetType,
    picksCount: picks.length,
  });

  // encode choice exactly how Rust expects
  const choiceU32 = encodeChoice({
    predictionTypeU8,
    picksAscUnique: picks,
    allowedNumbers,
  });


  // ===========================================================================
  // PDAs
  // ===========================================================================
  const liveFeedPda = getLiveFeedPda(tierU8);
  if (!liveFeedPda) throw new Error("Missing liveFeed PDA.");
  const firstEpochInChain =  BigInt((await program.account.liveFeed.fetch(liveFeedPda)).firstEpochInChain.toString());
  const predictionPda = getPredictionPda(player, firstEpochInChain, tierU8);
  const profilePda = getProfilePda(player);
  const treasuryPda = getTreasuryPda();
  const configPda = getConfigPda();

  if (!predictionPda || !profilePda || !treasuryPda || !configPda) {
    throw new Error("Missing PDA(s).");
  }

  // ===========================================================================
  // Instruction
  // ===========================================================================
  return program.methods
    .increasePrediction(tierU8, additionalPerNumberU64, choiceU32)
    .accountsStrict({
      player,
      liveFeed: liveFeedPda,
      prediction: predictionPda,
      profile: profilePda,
      config: configPda,
      treasury: treasuryPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}