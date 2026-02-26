import { atom } from "jotai";
import { formatBigInt, formatLamportsToSol, truncateBase58 } from '@/utils/solana_helper';
import { formatBps } from '@/utils/decoder';

// Type ready to be used.
export type LiveFeedReady = {
  epoch: bigint;
  first_epoch_in_chain: bigint;

  total_lamports: bigint;
  carried_over_lamports: bigint;

  total_bets: bigint;
  carried_over_bets: bigint;

  bet_cutoff_slots: bigint;

  tier: number;
  treasury: string;
  epochs_carried_over: number;
  bump: number;

  lamports_per_number: bigint[];
  bets_per_number: bigint[];

  secondary_rollover_number: number;
  current_fee_bps: number;

  _reserved: Uint8Array;
};


export type LiveFeedUI = {
  epochLabel: string;     // "1234 or 1234 ~ 5678"
  tierLabel: string;
  potSolText: string;     // "12.3456 SOL"
  potLamportsText: string;// "12,345,678,901"
  totalBetsText: string;  // "1,234 bets"
  carryText: string;      // "carried: 123 SOL • 456 bets"

  treasuryShort: string;  // "Abcd...Wxyz"
  fee: number;
  feeText: string;        // "Fee: 250 bps"
  rolloverText: string;   // "7"
};



export const liveFeedAtom = atom<{ pubkey: string; lamports: number; dataLen: number } | null>(null);
export const liveFeedDecodedAtom = atom<LiveFeedReady | null>(null);

export const liveFeedUIAtom = atom<LiveFeedUI | null>((get) => {
  const lf = get(liveFeedDecodedAtom);
  if (!lf) return null;

  const potSolText = `${formatLamportsToSol(lf.total_lamports, 4)} SOL`;
  const potLamportsText = formatBigInt(lf.total_lamports);

  const totalBetsText = `${formatBigInt(lf.total_bets)} bets`;

  const carryText =
    `${formatLamportsToSol(lf.carried_over_lamports, 4)} SOL`

  const epochLabel = lf.first_epoch_in_chain === lf.epoch ? lf.first_epoch_in_chain : `${lf.first_epoch_in_chain} ~ ${lf.epoch}`

  return {
    epochLabel: epochLabel.toString(),
    tierLabel: `Tier ${lf.tier}`,
    potSolText,
    potLamportsText,
    totalBetsText,
    carryText,
    treasuryShort: truncateBase58(lf.treasury),
    fee: lf.current_fee_bps,
    feeText: `${formatBps(lf.current_fee_bps)}`,
    rolloverText: `${lf.secondary_rollover_number}`,
  };
});


//Animations
export type LiveFeedFX = {
  lastUpdateAtMs: number;

  // "epoch rolled" style transitions
  epochChanged: boolean;

  // numeric deltas for nice count-up animations / badges
  potDeltaLamports: bigint;     // next.total_lamports - prev.total_lamports
  betsDelta: bigint;            // next.total_bets - prev.total_bets

  // distribution animations
  changedLamportsIndices: number[];
  changedBetsIndices: number[];
};

export const liveFeedFXAtom = atom<LiveFeedFX>({
  lastUpdateAtMs: 0,
  epochChanged: false,
  potDeltaLamports: 0n,
  betsDelta: 0n,
  changedLamportsIndices: [],
  changedBetsIndices: [],
});