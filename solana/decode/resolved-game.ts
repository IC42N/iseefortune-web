import { IC42N_ACCOUNTS_CODER } from "@/solana/anchor-client";
import type { AccountInfo } from "@solana/web3.js";
import bs58 from "bs58";
import { toBigInt, toU8Array } from "@/utils/decoder";

// Internal decoded shape (no any)
type AnchorResolvedGameDecoded = {
  epoch: unknown;
  tier: unknown;
  status: unknown;
  bump: unknown;
  winning_number: unknown;

  rng_epoch_slot_used: unknown;
  rng_blockhash_used: unknown;

  attempt_count: unknown;
  last_updated_slot: unknown;
  last_updated_ts: unknown;

  carry_over_bets: unknown;
  total_bets: unknown;
  carry_in_lamports: unknown;
  carry_out_lamports: unknown;
  protocol_fee_lamports: unknown;
  net_prize_pool: unknown;
  total_winners: unknown;
  claimed_winners: unknown;
  resolved_at: unknown;

  merkle_root: unknown;
  results_uri: unknown;
  claimed_bitmap: unknown;

  version: unknown;
  claimed_lamports: unknown;
  first_epoch_in_chain: unknown;
  rollover_reason: unknown;
  secondary_rollover_number: unknown;
  _reserved: unknown;
};

export type ResolvedGameReady = {
  epoch: bigint;
  tier: number;
  status_code: number;
  bump: number;
  winning_number: number;

  rng_epoch_slot_used: bigint;
  rng_blockhash_used_base58: string;

  attempt_count: number;
  last_updated_slot: bigint;
  last_updated_ts: bigint;

  carry_over_bets: number;
  total_bets: number;
  carry_in_lamports: bigint;
  carry_out_lamports: bigint;
  protocol_fee_lamports: bigint;
  net_prize_pool: bigint;
  total_winners: number;
  claimed_winners: number;
  resolved_at: bigint;

  merkle_root_base58: string;
  results_uri: string;

  claimed_bitmap_len: number;
  claimed_bitmap: Uint8Array;

  version: number;
  claimed_lamports: bigint;
  first_epoch_in_chain: bigint;
  rollover_reason: number;
  secondary_rollover_number: number;
  _reserved: Uint8Array;
};

function bytes32ToBase58(v: unknown, label: string): string {
  const u8 = toU8Array(v);
  if (u8.length !== 32) throw new Error(`${label}: expected 32 bytes, got ${u8.length}`);
  return bs58.encode(u8);
}

function fixedBytesToString(v: unknown): string {
  const u8 = toU8Array(v);
  const end = u8.indexOf(0);
  const slice = end === -1 ? u8 : u8.slice(0, end);
  return new TextDecoder().decode(slice).trim();
}

export function decodeResolvedGameFromData(data: Buffer): ResolvedGameReady {
  const raw = IC42N_ACCOUNTS_CODER.decode("ResolvedGame", data);
  const d = raw as AnchorResolvedGameDecoded;

  const claimed_bitmap = toU8Array(d.claimed_bitmap);

  return {
    epoch: toBigInt(d.epoch),
    tier: Number(d.tier),
    status_code: Number(d.status),
    bump: Number(d.bump),
    winning_number: Number(d.winning_number),

    rng_epoch_slot_used: toBigInt(d.rng_epoch_slot_used),
    rng_blockhash_used_base58: bytes32ToBase58(d.rng_blockhash_used, "rng_blockhash_used"),

    attempt_count: Number(d.attempt_count),
    last_updated_slot: toBigInt(d.last_updated_slot),
    last_updated_ts: toBigInt(d.last_updated_ts),

    carry_over_bets: Number(d.carry_over_bets),
    total_bets: Number(d.total_bets),
    carry_in_lamports: toBigInt(d.carry_in_lamports),
    carry_out_lamports: toBigInt(d.carry_out_lamports),
    protocol_fee_lamports: toBigInt(d.protocol_fee_lamports),
    net_prize_pool: toBigInt(d.net_prize_pool),
    total_winners: Number(d.total_winners),
    claimed_winners: Number(d.claimed_winners),
    resolved_at: toBigInt(d.resolved_at),

    merkle_root_base58: bytes32ToBase58(d.merkle_root, "merkle_root"),
    results_uri: fixedBytesToString(d.results_uri),

    claimed_bitmap_len: claimed_bitmap.length,
    claimed_bitmap,

    version: Number(d.version),
    claimed_lamports: toBigInt(d.claimed_lamports),
    first_epoch_in_chain: toBigInt(d.first_epoch_in_chain),
    rollover_reason: Number(d.rollover_reason),
    secondary_rollover_number: Number(d.secondary_rollover_number),
    _reserved: toU8Array(d._reserved),
  };
}

export function decodeResolvedGameFromAccountInfo(
  accountInfo: AccountInfo<Buffer>
): ResolvedGameReady {
  return decodeResolvedGameFromData(accountInfo.data);
}