import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { PlayerProfileStats } from "@/state/player-profile-atoms"
import { getPlayerRankFromStats } from '@/utils/rank';

const TABLE = process.env.PLAYERSTATS_TABLE_NAME!;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-west-1' }), {
  marshallOptions: { removeUndefinedValues: true },
});

export async function getPlayerStats(playerBase58: string): Promise<PlayerProfileStats | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { player: playerBase58 },
      ConsistentRead: false,
    })
  );

  if (!res.Item) return null;


  const totalCorrect = Number(res.Item.totalWins ?? 0);
  const totalWrong = Number(res.Item.totalLosses ?? 0);
  const totalGames = totalCorrect + totalWrong;
  const bestWinStreak = Number(res.Item.bestWinStreak ?? 0);

  const rank = getPlayerRankFromStats(totalCorrect, totalWrong, totalGames, bestWinStreak);

  return {
    player: String(res.Item.player),
    rank,
    createdAt: String(res.Item.createdAt ?? ""),
    updatedAt: String(res.Item.updatedAt ?? ""),

    lastPlayedTier: Number(res.Item.lastPlayedTier ?? 0),
    lastResult: String(res.Item.lastResult ?? ""),
    lastResultEpoch: Number(res.Item.lastResultEpoch ?? 0),

    currentWinStreak: Number(res.Item.currentWinStreak ?? 0),
    bestWinStreak,
    totalCorrect,
    totalWrong,

    totalWageredLamports: String(res.Item.totalWageredLamports ?? "0"),
    totalPayoutLamports: String(res.Item.totalPayoutLamports ?? "0"),
  };
}