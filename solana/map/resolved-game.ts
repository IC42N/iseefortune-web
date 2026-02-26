import type { ResolvedGameReady } from "@/solana/decode/resolved-game";
import type { ResolvedGameUI } from "@/state/resolved-game-types";

export function statusLabel(code: number): string {
  if (code === 0) return "Failed";
  if (code === 1) return "Processing";
  if (code === 2) return "Resolved";
  return "Unknown";
}

export function toResolvedGameUI(g: ResolvedGameReady): ResolvedGameUI {
  return {
    epoch: g.epoch,
    first_epoch_in_chain: g.first_epoch_in_chain,
    tier: g.tier,

    status_code: g.status_code,
    status_text: statusLabel(g.status_code),

    winning_number: g.winning_number,
    blockhash_used: g.rng_blockhash_used_base58,
    slot_used: g.rng_epoch_slot_used,

    total_bets: g.total_bets,
    carried_over_bets: g.carry_over_bets,

    net_prize_pool: g.net_prize_pool,
    carried_over_lamports: g.carry_out_lamports,

    total_winners: g.total_winners,
    claimed_winners: g.claimed_winners,

    resolved_at: g.resolved_at,

    results_uri: g.results_uri,
    merkle_root_base58: g.merkle_root_base58,
  };
}