import { atom } from "jotai";

export type ResolvedGameKey = `${string}:${number}`; // `${epoch}:${tier}`

export type TicketAward = {
  player: string;
  epoch: number;
  tier: number;
  placed_slot: number;
  lamports: number;
  rewarded: number;
};

export type TicketsJson = {
  epoch: number;
  tier: number;
  total_losers: number;
  total_ticket_recipients: number;
  ticket_reward_bps: number;
  ticket_reward_max: number;
  ticket_awards: TicketAward[];
  created_at_unix: number;
};

export type WinnerRow = {
  player: string;
  wager_lamports: number;
  payout_lamports: number;
};

export type ResolvedGameExtras = {
  key: ResolvedGameKey;
  fetchedAtMs: number;

  // Make winners always present once fetched
  winners: WinnerRow[];

  // Tickets are optional if you don't always fetch them
  tickets?: TicketsJson;

  total_losers?: number;
  total_ticket_recipients?: number;
};

export const resolvedGameExtrasByKeyAtom = atom<Map<ResolvedGameKey, ResolvedGameExtras>>(
  new Map()
);

export const upsertResolvedGameExtrasAtom = atom(
  null,
  (get, set, extra: ResolvedGameExtras) => {
    const next = new Map(get(resolvedGameExtrasByKeyAtom));
    next.set(extra.key, extra);
    set(resolvedGameExtrasByKeyAtom, next);
  }
);