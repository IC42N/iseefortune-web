// /firebase/activityFeedRepo.ts
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  type Unsubscribe,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/client";

export type ActivityMessageType = "system" | "game" | "chat";

export type ActivityMessage =
  | { id: string; type: "system"; subtype?: string; text: string; sort_key: number, winningNumber?: number, secondaryRolloverNumber?: number }
  | { id: string; type: "chat"; player: string; text: string; sort_key: number }
  | {
  id: string;
  type: "game";
  sort_key: number;
  subtype?: string;
  tier?: number;
  player?: string;

  // New prediction-friendly structured fields
  chosenNumbers?: number[];     // extras.chosen_numbers (array)
  chosenNumber?: number;        // legacy fallback
  lamportsPerNumber?: string;   // extras.lamports_per_number / additional_lamports_per_number
  totalLamports?: string;       // extras.total_lamports (optional)
};


type RawActivityDoc = {
  kind?: unknown;        // "game"
  subtype?: unknown;     // "bet_increase", "bet_placed", etc.
  text?: unknown;
  created_by?: unknown;  // wallet
  sort_key?: unknown;          // number (seconds or ms)
  tier?: unknown;
  extras?: unknown;      // map
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function normalizeEpochToMs(n: number): number {
  return n < 10_000_000_000 ? n * 1000 : n;
}

function asStringOrNumberToString(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function asNumberArray(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const out: number[] = [];
  for (const x of v) {
    if (typeof x !== "number" || !Number.isFinite(x)) return null;
    out.push(x);
  }
  return out;
}

function normalizeDoc(doc: QueryDocumentSnapshot): ActivityMessage | null {
  const data = doc.data() as RawActivityDoc;

  const subtype = asString(data.subtype) ?? undefined;
  const type: ActivityMessageType = data.kind as ActivityMessageType;

  const text = asString(data.text);
  const tsNum = asNumber(data.sort_key);
  if (tsNum === null) return null;

  const ts = normalizeEpochToMs(tsNum);

  const player = asString(data.created_by) ?? undefined;
  const tier = asNumber(data.tier) ?? undefined;

  const extras = asRecord(data.extras);

  // NEW (predictions)
  const chosenNumbers = asNumberArray(extras?.chosen_numbers) ?? undefined;

  // Legacy fallback (old bets)
  const chosenNumber = asNumber(extras?.chosen_number) ?? undefined;


  // Per-number lamports (exactly two supported keys)
  const lamportsPerNumber =
    asStringOrNumberToString(extras?.lamports_per_number) ??
    asStringOrNumberToString(extras?.additional_lamports_per_number) ??
    undefined;


  if (type === "system") {
    if (!text) return null;
    const winningNumber = asNumber(extras?.winning_number) ?? undefined;
    const secondaryRolloverNumber = asNumber(extras?.secondary_rollover_number) ?? undefined;
    return {
      id: doc.id,
      type: "system",
      subtype, text,
      sort_key: ts,
      winningNumber: winningNumber,
      secondaryRolloverNumber: secondaryRolloverNumber
    };
  }

  if (type === "chat") {
    if (!player || !text) return null;
    return { id: doc.id, type: "chat", player, text, sort_key: ts };
  }

  if (type === "game") {
    const hasNumbers = Boolean((chosenNumbers && chosenNumbers.length > 0) || chosenNumber !== undefined);
    const hasLamports = Boolean(lamportsPerNumber);

    if (!player || !hasNumbers || !hasLamports) return null;
    return {
      id: doc.id,
      type: "game",
      sort_key: ts,
      subtype,
      tier,
      player,
      chosenNumbers,
      chosenNumber,
      lamportsPerNumber,
    };
  }

  return null;
}

export type SubscribeActivityFeedArgs = {
  collectionPath?: string; // default: "activity_feed"
  limitCount?: number;     // default: 100
};

export function subscribeActivityFeed(
  onMessages: (messages: ActivityMessage[]) => void,
  onError?: (err: Error) => void,
  args?: SubscribeActivityFeedArgs
): Unsubscribe {
  const collectionPath = args?.collectionPath ?? "rooms";
  const limitCount = args?.limitCount ?? 100;

  const ref = collection(db, collectionPath);
  const q = query(ref, orderBy("sort_key", "desc"), limit(limitCount));
  //const q = query(ref, limit(limitCount));
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs
        .map(normalizeDoc)
        .filter((m): m is ActivityMessage => Boolean(m))
        .sort((a, b) => a.sort_key - b.sort_key);

      onMessages(msgs);
    },
    (err) => onError?.(err as unknown as Error)
  );
}