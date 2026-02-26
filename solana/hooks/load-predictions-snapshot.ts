import type { Connection, PublicKey } from "@solana/web3.js";
import {
  decodePredictionAccount,
  OFF_GAME_EPOCH,
  OFF_TIER,
  PREDICTION_ACCOUNT_SIZE,
} from "@/solana/decode/prediction";
import { anchorAccountDiscriminatorB58, memcmpU64LE, memcmpU8 } from '@/utils/decoder';
import { PredictionReady } from "@/state/prediction-atoms";

/* -------------------------------------------------------------------------- */
/* Snapshot loader                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Load all Prediction accounts for a given (gameEpoch, tier).
 *
 * - gameEpoch = LiveFeed.first_epoch_in_chain (stable game ID)
 * - tier      = tier number (1-based)
 *
 * This uses strict RPC-side filtering:
 *  - account size
 *  - Anchor discriminator
 *  - game_epoch
 *  - tier
 */
export async function loadPredictionsSnapshotForGameEpochTier(args: {
  connection: Connection;
  programId: PublicKey;
  gameEpoch: bigint;
  tier: number;
}): Promise<PredictionReady[]> {
  const { connection, programId, gameEpoch, tier } = args;

  const discB58 = anchorAccountDiscriminatorB58("Prediction"); // Uint8Array(8)
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    filters: [
      // Ensure only Prediction accounts (not legacy Bets)
      { dataSize: PREDICTION_ACCOUNT_SIZE },
      { memcmp: { offset: 0, bytes: discB58 } },
      // Stable game identifier + tier
      memcmpU64LE(gameEpoch, OFF_GAME_EPOCH),
      memcmpU8(tier, OFF_TIER),
    ],
  });

  const predictions: PredictionReady[] = [];

  for (const account of accounts) {
    const prediction = decodePredictionAccount(
      account.pubkey,
      account.account.data
    );

    // Defensive checks (filters should already enforce these)
    if (prediction.tier !== tier) continue;
    if (prediction.gameEpoch !== gameEpoch) continue;
    predictions.push(prediction);
  }
  return predictions;
}