import { Connection, PublicKey, Context, KeyedAccountInfo } from "@solana/web3.js";
import type { PredictionReady } from "@/state/prediction-atoms";
import {
  decodePredictionAccount,
  PREDICTION_ACCOUNT_SIZE,
  OFF_GAME_EPOCH,
  OFF_TIER,
} from "@/solana/decode/prediction";
import { anchorAccountDiscriminatorB58, memcmpU64LE, memcmpU8 } from '@/utils/decoder';

type SubscribePredictionsArgs = {
  connection: Connection;
  programId: PublicKey;
  gameEpoch: bigint;
  tier: number;

  onPrediction: (prediction: PredictionReady, meta: { slot: number; pubkey: string }) => void;
  onError?: (err: unknown) => void;
};


/**
 * Subscribe to Prediction PDAs for a given (gameEpoch, tier).
 *
 * IMPORTANT:
 * - Includes an account discriminator filter so legacy Bet accounts never match,
 *   even if offsets overlap.
 */
export function subscribeToPredictionsForGameEpochTier(args: SubscribePredictionsArgs) {
  const { connection, programId, gameEpoch, tier, onPrediction, onError } = args;

  // ------------------------------------------------------------
  // Account discriminator filter (Prediction)
  // ------------------------------------------------------------
  const discB58 = anchorAccountDiscriminatorB58("Prediction");

  // ------------------------------------------------------------
  // Program account filters
  // ------------------------------------------------------------
  const filters = [
    { dataSize: PREDICTION_ACCOUNT_SIZE },

    // Ensure this is a Prediction account (not legacy bet)
    { memcmp: { offset: 0, bytes: discB58 } },

    // Scope: gameEpoch + tier
    memcmpU64LE(gameEpoch, OFF_GAME_EPOCH),
    memcmpU8(tier, OFF_TIER),
  ];

  // ------------------------------------------------------------
  // Subscribe
  // ------------------------------------------------------------
  const subId = connection.onProgramAccountChange(
    programId,
    (keyed: KeyedAccountInfo, ctx: Context) => {
      try {
        const pubkeyStr = keyed.accountId.toBase58();
        const prediction = decodePredictionAccount(keyed.accountId, keyed.accountInfo.data);

        // Defensive checks (filters should already enforce these)
        if (prediction.tier !== tier) return;
        if (prediction.gameEpoch !== gameEpoch) return;

        onPrediction(prediction, { slot: ctx.slot, pubkey: pubkeyStr });
      } catch (e) {
        onError?.(e);
      }
    },
    { commitment: "confirmed", filters }
  );

  return {
    subscriptionId: subId,
    stop: async () => {
      await connection.removeProgramAccountChangeListener(subId);
    },
  };
}