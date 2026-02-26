export type ResolvedGameSummary = {
  gameEpoch: string;        // stored as string to avoid bigint JSON issues
  firstEpoch: string;
  resolvedEpoch: string;
  tier: number;
  winningNumber: number;    // or number[] if you support multiple
  arweaveUrl?: string;
  resolvedAt?: string;
  blockhash?: string;
  netPotLamports?: number;
  signature?: string;
  winnersCount?: number;
};



export type ResolvedGameUI = {
  epoch: bigint;
  first_epoch_in_chain: bigint;
  tier: number;

  status_code: number;
  status_text: string;

  winning_number: number;
  blockhash_used: string;
  slot_used: bigint;

  total_bets: number;
  carried_over_bets: number;

  net_prize_pool: bigint;
  carried_over_lamports: bigint;

  total_winners: number;
  claimed_winners: number;

  resolved_at: bigint;

  results_uri: string;
  merkle_root_base58: string;
};

export type ResolvedGameUIDisplay = {
  epoch: number,
  first_epoch_in_chain: number,
  game_epoch: string;
  is_multi_epoch: boolean;
  tier: string;
  status_code: number,
  status_text: string,
  is_final: boolean,

  is_rollover: boolean;
  is_no_winners: boolean;

  winning_number: string;
  blockhash_used: string;
  slot_used: string;

  total_bets: string;
  carried_over_bets: string;

  net_prize_lamports: string;
  net_prize_sol: string;
  carried_over_lamports: string;
  carried_over_sol: string;

  total_winners: string;
  total_missed: string;
  claimed_winners: string;

  resolved_at: string;

  results_uri: string;
  merkle_root_base58: string;
};