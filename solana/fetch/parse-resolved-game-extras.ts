import type { TicketsJson, WinnerRow } from "@/state/resolved-game-extras-atoms";

type IJson = {
  winners?: Array<{
    player?: unknown;
    wager_lamports?: unknown;
    payout_lamports?: unknown;
  }>;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null;
}

function mustString(v: unknown, label: string): string {
  if (typeof v !== "string" || v.length === 0) throw new Error(`${label}: expected string`);
  return v;
}

function mustNumber(v: unknown, label: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`${label}: expected number`);
  return n;
}

function pickNumber(obj: UnknownRecord, keys: readonly string[], label: string): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  throw new Error(`${label}: missing numeric field (tried ${keys.join(", ")})`);
}


export function parseWinnersFromIJsonObject(obj: unknown): WinnerRow[] {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid i.json object");
  }

  const i = obj as IJson;
  const raw = Array.isArray(i.winners) ? i.winners : [];

  return raw
    .map((row, idx): WinnerRow => {
      if (!isRecord(row)) throw new Error(`winners[${idx}] must be an object`);

      const player = mustString(row["player"], `winners[${idx}].player`);

      // 🔥 pick your meaning of "wager_lamports" here:
      // If you want winner stake to reflect ONLY the winning-number portion, put win_portion first.
      // If you want total wager, put total first.
      const wager_lamports = pickNumber(
        row,
        ["wager_win_portion_lamports", "wager_total_lamports", "wager_lamports"],
        `winners[${idx}].wager`
      );

      const payout_lamports = mustNumber(row["payout_lamports"], `winners[${idx}].payout_lamports`);

      return { player, wager_lamports, payout_lamports };
    })
    .sort((a, b) => b.payout_lamports - a.payout_lamports);
}

export function parseTicketsJsonObject(obj: unknown): TicketsJson {
  if (!obj || typeof obj !== "object") throw new Error("Invalid tickets JSON object");

  const t = obj as TicketsJson;
  if (!Array.isArray(t.ticket_awards)) throw new Error("tickets.ticket_awards missing");

  return t;
}