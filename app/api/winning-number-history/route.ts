import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from '@/utils/dynamodb';


export const runtime = "nodejs";

type WinningHistoryRow = {
  epoch: number;
  endSlot: number | null;
  slotUsed: number | null;
  rngBlockhashBase58: string | null;
  winningNumber: number | null;
};

type WinningHistoryDdbItem = {
  epoch: number;
  endSlot?: number;
  slotUsed?: number;
  rngBlockhashBase58?: string;
  winningNumber?: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);

  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 50);

  // const tableName = process.env.WINNING_NUMBER_HISTORY_TABLE_NAME;
  // if (!tableName) {
  //   return NextResponse.json(
  //     { error: "Missing WINNING_NUMBER_HISTORY_TABLE_NAME" },
  //     { status: 500 }
  //   );
  // }

  const out = await ddb.send(
    new QueryCommand({
      TableName: 'ic42n_winning_number_history',
      KeyConditionExpression: "#pk = :pk AND #epoch >= :minEpoch",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#epoch": "epoch",
      },
      ExpressionAttributeValues: {
        ":pk": "WINNING_HISTORY",
        ":minEpoch": 0,
      },
      ScanIndexForward: false, // newest -> oldest
      Limit: limit,
      ProjectionExpression:
        "epoch, endSlot, slotUsed, rngBlockhashBase58, winningNumber",
    })
  );

  const items: WinningHistoryRow[] =
    (out.Items as WinningHistoryDdbItem[] | undefined)?.map((it) => ({
      epoch: it.epoch,
      endSlot: it.endSlot ?? null,
      slotUsed: it.slotUsed ?? null,
      rngBlockhashBase58: it.rngBlockhashBase58 ?? null,
      winningNumber: it.winningNumber ?? null,
    })) ?? [];

  // Extra safety in case anything weird slips in
  items.sort((a, b) => b.epoch - a.epoch);

  return NextResponse.json(
    { count: items.length, items },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}