import type { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import type { TransactionInstruction } from "@solana/web3.js";
import type { BetModalState } from "@/state/betting-atom";
import { getLiveFeedPda, getPredictionPda, getProfilePda } from "@/solana/pdas";
import type { Ic42nProgram } from "@/solana/anchor-client";
import { encodeChoice, normalizePicks, uiBetTypeToPredictionType } from "@/utils/place_prediction";

export async function buildChangeNumberIx(args: {
  program: Ic42nProgram;
  provider: AnchorProvider;
  state: BetModalState; // mode === "changeNumber"
  allowedNumbers: readonly number[];
}): Promise<TransactionInstruction> {
  const { program, provider, state, allowedNumbers } = args;

  if (state.mode !== "changeNumber") {
    throw new Error("buildChangeNumberIx called in non-changeNumber mode.");
  }

  const player = provider.publicKey;
  if (!player) throw new Error("Wallet not connected.");

  const { tierId, numbers } = state.fields;

  // tier u8
  const tierU8 = Number(tierId);
  if (!Number.isInteger(tierU8) || tierU8 < 0 || tierU8 > 255) {
    throw new Error("Invalid tierId.");
  }

  // Enforce the same pick-count as the original prediction (matches on-chain invariant)
  const originalCount = state.original?.numbers?.length ?? null;
  if (originalCount == null) {
    throw new Error("Missing original prediction snapshot for changeNumber.");
  }

  // normalize picks (asc + unique + allowed)
  const uiBetType = state.fields.betType; // 0|1|2|3
  const picks = normalizePicks({ picks: numbers, allowedNumbers });
  if (picks.length === 0) throw new Error("Pick a number first.");

  if (picks.length !== originalCount) {
    throw new Error(`You must keep the same number of picks (${originalCount}).`);
  }

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
  // PDAs (prediction seed uses live_feed.first_epoch_in_chain)
  // ===========================================================================
  const liveFeedPda = getLiveFeedPda(tierU8);
  if (!liveFeedPda) throw new Error("Missing liveFeed PDA.");
  const firstEpochInChain = BigInt((await program.account.liveFeed.fetch(liveFeedPda)).firstEpochInChain.toString());
  const predictionPda = getPredictionPda(player, firstEpochInChain, tierU8);
  const profilePda: PublicKey = getProfilePda(player);
  if (!predictionPda || !profilePda) {
    throw new Error("Missing PDA(s).");
  }

  // ===========================================================================
  // Instruction
  // ===========================================================================
  return program.methods
    .changePredictionNumber(tierU8, predictionTypeU8, choiceU32)
    .accountsStrict({
      player,
      liveFeed: liveFeedPda,
      prediction: predictionPda,
      profile: profilePda,
    })
    .instruction();
}