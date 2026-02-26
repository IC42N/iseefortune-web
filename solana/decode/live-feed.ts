import { toBigInt, toPubkeyBase58, toU8Array } from '@/utils/decoder';
import { LiveFeedReady } from '@/state/live-feed-atoms';
import { IC42N_ACCOUNTS_CODER } from '@/solana/anchor-client';
import { AccountInfo } from '@solana/web3.js';

// Temporary object so we avoid "any"
type AnchorLiveFeedDecoded = {
  epoch: unknown;
  first_epoch_in_chain: unknown;

  total_lamports: unknown;
  carried_over_lamports: unknown;

  total_bets: unknown;
  carried_over_bets: unknown;

  bet_cutoff_slots: unknown;

  tier: unknown;
  treasury: unknown;
  epochs_carried_over: unknown;
  bump: unknown;

  lamports_per_number?: unknown[];
  bets_per_number?: unknown[];

  secondary_rollover_number: unknown;
  current_fee_bps: unknown;

  _reserved: unknown;
};

export function mapLiveFeedDecoded(decoded: AnchorLiveFeedDecoded): LiveFeedReady {
  // straight assigns (snake_case only)
  const epoch = decoded.epoch;
  const firstEpochInChain = decoded.first_epoch_in_chain;

  const totalLamports = decoded.total_lamports;
  const carriedOverLamports = decoded.carried_over_lamports;

  const totalBets = decoded.total_bets;
  const carriedOverBets = decoded.carried_over_bets;

  const betCutoffSlots = decoded.bet_cutoff_slots;

  const tier = decoded.tier;
  const epochsCarriedOver = decoded.epochs_carried_over;
  const bump = decoded.bump;

  const lamportsPerNumber = decoded.lamports_per_number ?? [];
  const betsPerNumber = decoded.bets_per_number ?? [];

  const secondaryRolloverNumber = decoded.secondary_rollover_number;
  const currentFeeBps = decoded.current_fee_bps;

  const reserved = decoded._reserved;

  return {
    epoch: toBigInt(epoch),
    first_epoch_in_chain: toBigInt(firstEpochInChain),

    total_lamports: toBigInt(totalLamports),
    carried_over_lamports: toBigInt(carriedOverLamports),

    total_bets: toBigInt(totalBets),
    carried_over_bets: toBigInt(carriedOverBets),

    bet_cutoff_slots: toBigInt(betCutoffSlots),

    tier: Number(tier),

    treasury: toPubkeyBase58(decoded.treasury),

    epochs_carried_over: Number(epochsCarriedOver),
    bump: Number(bump),

    lamports_per_number: lamportsPerNumber.map(toBigInt),
    bets_per_number: betsPerNumber.map(toBigInt),

    secondary_rollover_number: Number(secondaryRolloverNumber),
    current_fee_bps: Number(currentFeeBps),

    _reserved: toU8Array(reserved),
  };
}


export function decodeLiveFeedFromData(data: Buffer): LiveFeedReady {
  const raw = IC42N_ACCOUNTS_CODER.decode("LiveFeed", data);
  return mapLiveFeedDecoded(raw as AnchorLiveFeedDecoded);
}

export function decodeLiveFeedFromAccountInfo(
  accountInfo: AccountInfo<Buffer>
): LiveFeedReady {
  return decodeLiveFeedFromData(accountInfo.data);
}