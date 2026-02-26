import { PublicKey, Connection } from "@solana/web3.js";
import { decodePredictionAccount, PREDICTION_ACCOUNT_SIZE, PREDICTION_DISC } from '@/solana/decode/prediction';
import { PredictionReady } from '@/state/prediction-atoms';
import { hasAnchorDiscriminator } from '@/utils/decoder';

export async function fetchRecentPredictionsOneShot(
  connection: Connection,
  recentPredictionPdas: PublicKey[],
): Promise<PredictionReady[]> {
  if (!recentPredictionPdas.length) return [];

  const infos = await connection.getMultipleAccountsInfo(recentPredictionPdas, {
    commitment: "confirmed",
  });

  const out: PredictionReady[] = [];

  for (let i = 0; i < recentPredictionPdas.length; i++) {
    const info = infos[i];
    const data = info?.data;
    if (!data) continue; // account missing/closed

    // Hard filter: must be a Prediction account
    if (data.length !== PREDICTION_ACCOUNT_SIZE) continue;
    if (!hasAnchorDiscriminator(data, PREDICTION_DISC)) continue;

    out.push(decodePredictionAccount(recentPredictionPdas[i], data));
  }

  return out;
}
