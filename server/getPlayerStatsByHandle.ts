import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { PlayerProfileStats } from "@/state/player-profile-atoms";
import { getPlayerRankFromStats } from "@/utils/rank";

const TABLE = process.env.PLAYERSTATS_TABLE_NAME!;
const HANDLE_INDEX = "handle-index";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'us-west-1' }),
  { marshallOptions: { removeUndefinedValues: true } }
);

// Fetch the stats for a player by handle from DynamoDB.
export async function getPlayerStatsByHandle(
  handle: string
): Promise<PlayerProfileStats | null> {
  const normalized = handle.trim().toUpperCase();

  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: HANDLE_INDEX,
      KeyConditionExpression: "#h = :h",
      ExpressionAttributeNames: { "#h": "handle" },
      ExpressionAttributeValues: { ":h": normalized },
      Limit: 10, // handle collisions possible
    })
  );

  const items = res.Items ?? [];
  if (items.length === 0) return null;

  // Pick the “best” candidate deterministically
  items.sort((a, b) => {
    const ag = Number(a.totalWins ?? 0) + Number(a.totalLosses ?? 0);
    const bg = Number(b.totalWins ?? 0) + Number(b.totalLosses ?? 0);
    return bg - ag; // prefer most games played
  });

  const item = items[0];

  const totalCorrect = Number(item.totalWins ?? 0);
  const totalWrong = Number(item.totalLosses ?? 0);
  const totalGames = totalCorrect + totalWrong;
  const bestWinStreak = Number(item.bestWinStreak ?? 0);

  const rank = getPlayerRankFromStats(
    totalCorrect,
    totalWrong,
    totalGames,
    bestWinStreak
  );

  return {
    player: String(item.player),
    rank,
    createdAt: String(item.createdAt ?? ""),
    updatedAt: String(item.updatedAt ?? ""),

    lastPlayedTier: Number(item.lastPlayedTier ?? 0),
    lastResult: String(item.lastResult ?? ""),
    lastResultEpoch: Number(item.lastResultEpoch ?? 0),

    currentWinStreak: Number(item.currentWinStreak ?? 0),
    bestWinStreak,
    totalCorrect,
    totalWrong,

    totalWageredLamports: String(item.totalWageredLamports ?? "0"),
    totalPayoutLamports: String(item.totalPayoutLamports ?? "0"),
  };
}