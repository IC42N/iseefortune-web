import { PublicKey } from "@solana/web3.js";
import { PredictionReady } from '@/state/prediction-atoms';
import { anchorAccountDiscriminator, readI64LE, readPubkey, readSelectionsArray, readU16LE, readU64LE, selectionsFromMask } from '@/utils/decoder';
import { generateHandleFromWalletPubKey } from '@/utils/profile';

export const PREDICTION_ACCOUNT_SIZE = 129;
export const PREDICTION_DISC = anchorAccountDiscriminator("Prediction");

// Offsets (absolute, including discriminator)
export const OFF_GAME_EPOCH = 8;                 // u64
export const OFF_EPOCH = 16;                     // u64
export const OFF_PLAYER = 24;                    // Pubkey (32)
export const OFF_TIER = 56;                      // u8

export const OFF_PREDICTION_TYPE = 57;           // u8
export const OFF_SELECTION_COUNT = 58;           // u8
export const OFF_SELECTION_MASK = 59;            // u16 (LE)
export const OFF_SELECTIONS = 61;                // [u8; 8]

// Still the same spot as before:
export const OFF_LAMPORTS_TOTAL = 69;            // u64

// Back to the old positions:
export const OFF_CHANGED_COUNT = 77;             // u8
export const OFF_PLACED_SLOT = 78;               // u64
export const OFF_PLACED_AT_TS = 86;              // i64
export const OFF_LAST_UPDATED_AT_TS = 94;        // i64
export const OFF_HAS_CLAIMED = 102;              // u8
export const OFF_CLAIMED_AT_TS = 103;            // i64
//export const OFF_BUMP = 111;                     // u8
export const OFF_VERSION = 112;
export const OFF_LAMPORTS_PER_NUMBER = 113;

/**
 * Decode Prediction account bytes into PredictionReady.
 */
export function decodePredictionAccount(pubkey: PublicKey, data: Uint8Array): PredictionReady {
  if (data.length !== PREDICTION_ACCOUNT_SIZE) {
    throw new Error(`Invalid Prediction size: got ${data.length}, expected ${PREDICTION_ACCOUNT_SIZE}`);
  }

  const player = readPubkey(data, OFF_PLAYER);
  const tier = data[OFF_TIER] ?? 0;

  const predictionType = data[OFF_PREDICTION_TYPE] ?? 0;
  const selectionCount = data[OFF_SELECTION_COUNT] ?? 0;

  const selectionsMask = readU16LE(data, OFF_SELECTION_MASK);
  const selections = selectionsFromMask(selectionsMask);

  if (process.env.NODE_ENV !== "production") {
    const selectionsFromArray = readSelectionsArray(data, OFF_SELECTIONS);
    if (selectionCount !== selections.length || selectionCount !== selectionsFromArray.length) {
      console.warn("[Prediction decode] inconsistent selections", {
        pubkey: pubkey.toBase58(),
        tier,
        selectionCount,
        maskCount: selections.length,
        arrayCount: selectionsFromArray.length,
        selectionsMask,
        selectionsFromMask: selections,
        selectionsArray: selectionsFromArray,
      });
    }
  }

  const wagerTotalLamports = readU64LE(data, OFF_LAMPORTS_TOTAL); // bigint
  const version = data[OFF_VERSION] ?? 1;

  const wagerLamportsPerNumber =
    version >= 2
      ? readU64LE(data, OFF_LAMPORTS_PER_NUMBER)
      : wagerTotalLamports / BigInt(Math.max(1, selectionCount));

  return {
    pubkey,
    gameEpoch: readU64LE(data, OFF_GAME_EPOCH),
    epoch: readU64LE(data, OFF_EPOCH),
    player,
    handle: generateHandleFromWalletPubKey(player.toBase58()),
    tier,

    predictionType,
    selectionCount,
    selectionsMask,
    selections,

    wagerTotalLamports,
    wagerLamportsPerNumber,

    changedCount: data[OFF_CHANGED_COUNT] ?? 0,
    placedSlot: readU64LE(data, OFF_PLACED_SLOT),
    placedAtTs: readI64LE(data, OFF_PLACED_AT_TS),
    lastUpdatedAtTs: readI64LE(data, OFF_LAST_UPDATED_AT_TS),
    hasClaimed: (data[OFF_HAS_CLAIMED] ?? 0) === 1,
    claimedAtTs: readI64LE(data, OFF_CLAIMED_AT_TS),
  };
}