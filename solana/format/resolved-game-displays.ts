import type { ResolvedGameUI, ResolvedGameUIDisplay } from "@/state/resolved-game-types";
import { formatLamportsToSol } from '@/utils/solana_helper';
import { bigintUnixSecondsToLocalString } from '@/utils/time';
import { formatEpochRange } from '@/utils/resolved-game-helper';

export function toResolvedGameUIDisplay(g: ResolvedGameUI): ResolvedGameUIDisplay {
  const carriedSol = formatLamportsToSol(g.carried_over_lamports);
  const gameEpoch = formatEpochRange(g.first_epoch_in_chain, g.epoch);

  const statusCode = Number(g.status_code);
  const isFinal = statusCode === 2;

  return {
    epoch: Number(g.epoch),
    first_epoch_in_chain: Number(g.first_epoch_in_chain),
    game_epoch: gameEpoch,
    is_multi_epoch: g.first_epoch_in_chain !== 0n && g.first_epoch_in_chain !== g.epoch,
    tier: `${g.tier}`,

    status_code: statusCode,
    status_text: g.status_text,
    is_final: isFinal,

    is_rollover: g.carried_over_bets === g.total_bets, // If carry over is the same, then it's a rollover
    is_no_winners: g.total_winners === 0,

    winning_number: String(g.winning_number),
    blockhash_used: g.blockhash_used,
    slot_used: g.slot_used.toString(),

    total_bets: g.total_bets.toLocaleString(),
    carried_over_bets: g.carried_over_bets.toLocaleString(),

    net_prize_sol: formatLamportsToSol(g.net_prize_pool),
    net_prize_lamports: g.net_prize_pool.toString(),

    carried_over_lamports: g.carried_over_lamports.toString(),
    carried_over_sol: carriedSol,

    total_winners: g.total_winners.toLocaleString(),
    total_missed: (g.total_bets - g.total_winners).toLocaleString(),
    claimed_winners: g.claimed_winners.toLocaleString(),

    resolved_at: bigintUnixSecondsToLocalString(g.resolved_at),

    results_uri: g.results_uri,
    merkle_root_base58: g.merkle_root_base58,
  };
}