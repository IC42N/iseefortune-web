export type ProfileFetchResponse = {
  winner: null | {
    index: number;
    payout_lamports: string;
    proof: string[];
  };
  ticketAward: null | {
    placed_slot: number;
    lamports: string;
    rewarded: number;
  };
};