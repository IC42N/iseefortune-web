import type { AnchorProvider } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import type { BetModalState } from '@/state/betting-atom';
import type { TransactionInstruction } from "@solana/web3.js";
import { getConfigPda, getLiveFeedPda, getPredictionPda, getProfilePda, getTreasuryPda } from "@/solana/pdas";
import { Ic42nProgram } from "@/solana/anchor-client";
import { encodeChoice, normalizePicks, uiBetTypeToPredictionType, validateLamportsU64 } from '@/utils/place_prediction';


export async function buildPlacePredictionIx(args: {
  program: Ic42nProgram;
  provider: AnchorProvider;
  state: BetModalState; // expects mode === "new"
  allowedNumbers: readonly number[];
}): Promise<TransactionInstruction> {
  const { program, provider, state, allowedNumbers } = args;

  if (state.mode !== "new") throw new Error("buildPlacePredictionIx called in non-new mode.");

  const player = provider.publicKey;
  if (!player) throw new Error("Wallet not connected.");

  const { gameEpoch, tierId, numbers, lamportsPerNumber } = state.fields;

  // tier u8
  const tierU8 = Number(tierId);
  if (!Number.isInteger(tierU8) || tierU8 < 0 || tierU8 > 255) {
    throw new Error("Invalid tierId.");
  }

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

  // per-number lamports u64 (program will multiply internally)
  const perOk = validateLamportsU64(lamportsPerNumber);
  const lamportsU64 = new BN(perOk.toString());

  // PDAs
  const liveFeedPda = getLiveFeedPda(tierU8);
  const predictionPda = getPredictionPda(player, gameEpoch, tierU8);
  const profilePda = getProfilePda(player);
  const treasuryPda = getTreasuryPda();
  const configPda = getConfigPda();

  // Optional: guard if any PDA can be null/undefined
  if (!liveFeedPda || !predictionPda || !profilePda || !treasuryPda || !configPda) {
    throw new Error("Missing PDA(s).");
  }

  return program.methods
    .placePrediction(tierU8, predictionTypeU8, choiceU32, lamportsU64)
    .accountsStrict({
      player,
      liveFeed: liveFeedPda,
      prediction: predictionPda,
      profile: profilePda,
      treasury: treasuryPda,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}