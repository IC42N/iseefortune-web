import { PublicKey } from "@solana/web3.js";
import { atom } from "jotai";
import { sameNumberSet } from "@/components/BetModal/utils";

export type BetTypeId = 0 | 1 | 2 | 3;

/* ============================================================================
 * Core Betting Fields (canonical: per-number stake)
 * ============================================================================
 */
export type BettingFields = {
  player: PublicKey;
  tierId: number;
  gameEpoch: bigint; // used to derive Prediction PDA
  betType: BetTypeId;
  numbers: number[]; // picks (single/split), or encoded choice for other bet types

  // CANONICAL (new model): stake per selected number
  lamportsPerNumber: bigint;
};

/* ============================================================================
 * Modal Modes
 * ============================================================================
 */
export type BetModalMode = "new" | "addLamports" | "changeNumber";

/* ============================================================================
 * Modal State
 * ============================================================================
 */
export type BetModalState = {
  mode: BetModalMode;
  fields: BettingFields;

  // Snapshot when editing an existing prediction
  original?: BettingFields;

  betPda?: PublicKey; // rename later to predictionPda for clarity
};

/* ============================================================================
 * Helpers (derived values)
 * ============================================================================
 */
export function picksCount(fields: Pick<BettingFields, "numbers">) {
  return Math.max(1, fields.numbers.length);
}

export function totalLamports(fields: BettingFields) {
  return fields.lamportsPerNumber * BigInt(picksCount(fields));
}

/**
 * How much SOL will be spent by this modal action (wallet impact).
 * - new: perNumber * picks
 * - addLamports: deltaPerNumber * picks
 * - changeNumber: 0 (ticket-only)
 */
export function payLamportsForModal(fields: BettingFields, mode: BetModalMode, original?: BettingFields) {
  const picks = BigInt(picksCount(fields));

  switch (mode) {
    case "new":
      return fields.lamportsPerNumber * picks;

    case "addLamports": {
      const before = original?.lamportsPerNumber ?? 0n;
      const delta = fields.lamportsPerNumber - before; // per-number delta
      return (delta > 0n ? delta : 0n) * picks;
    }

    case "changeNumber":
      return 0n;
  }
}

function assertFieldsInvariant(fields: BettingFields) {
  if (process.env.NODE_ENV === "production") return;

  if (fields.lamportsPerNumber < 0n) {
    console.warn("[BetModal] lamportsPerNumber < 0", fields);
  }

  const total = totalLamports(fields);
  const picks = BigInt(picksCount(fields));
  if (picks > 0n && total % picks !== 0n) {
    console.warn("[BetModal] totalLamports not divisible by picks (unexpected)", { total, picks, fields });
  }
}

/* ============================================================================
 * Root Modal Atom
 * ============================================================================
 */
export const betModalAtom = atom<BetModalState | null>(null);

export const resetBetModalAtom = atom(null, (_get, set) => {
  set(betModalAtom, null);
});

export const isBetModalOpenAtom = atom((get) => get(betModalAtom) !== null);

export const openBetModalAtom = atom(null, (_get, set, state: BetModalState) => {
  set(betModalAtom, state);
});

export const betModalFieldsAtom = atom(
  (get) => get(betModalAtom)?.fields ?? null,
  (get, set, patch: Partial<BettingFields>) => {
    const cur = get(betModalAtom);
    if (!cur) return;
    set(betModalAtom, { ...cur, fields: { ...cur.fields, ...patch } });
  }
);

/* ============================================================================
 * Modal Mode (read/write)
 * ============================================================================
 */
export const betModalModeAtom = atom(
  (get) => get(betModalAtom)?.mode ?? null,
  (get, set, mode: BetModalMode) => {
    const cur = get(betModalAtom);
    if (!cur) return;
    set(betModalAtom, { ...cur, mode });
  }
);

/* ============================================================================
 * Diff (for UX + button states)
 * ============================================================================
 */
type BettingFieldKey = keyof BettingFields;

export type BetModalDiff = {
  changed: Partial<Record<BettingFieldKey, boolean>>;
  hasChanges: boolean;

  // canonical + derived deltas
  lamportsPerNumberDelta?: bigint;
  totalLamportsDelta?: bigint;

  betTypeChanged?: boolean;
  numbersChanged?: boolean;

  picksBefore?: number;
  picksAfter?: number;
};

export const betModalDiffAtom = atom((get) => {
  const m = get(betModalAtom);
  if (!m) return null;

  const after = m.fields;
  const before = m.original;

  if (process.env.NODE_ENV !== "production") {
    assertFieldsInvariant(after);
    if (before) assertFieldsInvariant(before);
  }

  // NEW prediction: diff isn't meaningful, but we still return useful context
  if (!before) {
    return {
      changed: {},
      hasChanges: true,
      picksAfter: after.numbers.length,
    } satisfies BetModalDiff;
  }

  const changed: Partial<Record<BettingFieldKey, boolean>> = {};

  if (!before.player.equals(after.player)) changed.player = true;
  if (before.tierId !== after.tierId) changed.tierId = true;
  if (before.gameEpoch !== after.gameEpoch) changed.gameEpoch = true;

  const betTypeChanged = before.betType !== after.betType;
  if (betTypeChanged) changed.betType = true;

  const numbersChanged = !sameNumberSet(before.numbers, after.numbers);
  if (numbersChanged) changed.numbers = true;

  if (before.lamportsPerNumber !== after.lamportsPerNumber) changed.lamportsPerNumber = true;

  const hasChanges = Object.keys(changed).length > 0;

  const picksBefore = before.numbers.length;
  const picksAfter = after.numbers.length;

  const lamportsPerNumberDelta = after.lamportsPerNumber - before.lamportsPerNumber;
  const totalLamportsDelta = totalLamports(after) - totalLamports(before);

  return {
    changed,
    hasChanges,
    lamportsPerNumberDelta,
    totalLamportsDelta,
    betTypeChanged,
    numbersChanged,
    picksBefore,
    picksAfter,
  } satisfies BetModalDiff;
});