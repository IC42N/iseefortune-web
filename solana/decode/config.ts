import { toBigInt, toPubkeyBase58, toU8Array } from '@/utils/decoder';

import type { ConfigReady } from "@/state/config-atoms";
import { TierSettingsReady } from '@/state/tier-atoms';


export type AnchorTierSettingsDecoded = {
  tier_id: unknown;
  active: unknown;
  min_bet_lamports: unknown;
  max_bet_lamports: unknown;
  curve_factor: unknown;
  ticket_reward_bps: unknown;
  ticket_reward_max: unknown;
  tickets_rewarded: unknown;
  _reserved?: unknown;
};

export type AnchorConfigDecoded = {
  pause_bet: unknown;
  pause_withdraw: unknown;
  authority: unknown;
  fee_vault: unknown;
  base_fee_bps: unknown;
  bet_cutoff_slots: unknown;
  started_at: unknown;
  started_epoch: unknown;
  primary_roll_over_number: unknown;
  tiers: unknown; // should be AnchorTierSettingsDecoded[] but keep unknown-friendly
  bump: unknown;
  min_fee_bps: unknown;
  rollover_fee_step_bps: unknown;
  _reserved: unknown;
};


function mapTierSettingsDecoded(t: AnchorTierSettingsDecoded): TierSettingsReady {
  return {
    tier_id: Number(t.tier_id),
    active: Number(t.active),
    min_bet_lamports: toBigInt(t.min_bet_lamports),
    max_bet_lamports: toBigInt(t.max_bet_lamports),
    curve_factor: Number(t.curve_factor),
    ticket_reward_bps: Number(t.ticket_reward_bps),
    ticket_reward_max: Number(t.ticket_reward_max),
    tickets_rewarded: Number(t.tickets_rewarded),
    reserved: toU8Array(t._reserved ?? []),
  };
}

export function mapConfigDecoded(decoded: AnchorConfigDecoded): ConfigReady {
  const tiersRaw = (decoded.tiers as AnchorTierSettingsDecoded[]) ?? [];

  return {
    pauseBet: Number(decoded.pause_bet),
    pauseWithdraw: Number(decoded.pause_withdraw),

    authority: toPubkeyBase58(decoded.authority),
    feeVault: toPubkeyBase58(decoded.fee_vault),

    baseFeeBps: Number(decoded.base_fee_bps),
    betCutoffSlots: toBigInt(decoded.bet_cutoff_slots),

    // i64 (can be negative) → bigint
    startedAt: toBigInt(decoded.started_at),
    startedEpoch: toBigInt(decoded.started_epoch),

    primaryRollOverNumber: Number(decoded.primary_roll_over_number),

    tiers: tiersRaw.map(mapTierSettingsDecoded),

    bump: Number(decoded.bump),

    minFeeBps: Number(decoded.min_fee_bps),
    rolloverFeeStepBps: Number(decoded.rollover_fee_step_bps),

    reserved: toU8Array(decoded._reserved),
  };
}

/**
 * Safe narrowing for anything coming from atoms/storage/etc.
 * Useful when configDecodedAtom can be unknown.
 */
export function asConfigDecoded(v: unknown): ConfigReady | null {
  if (!v || typeof v !== "object") return null;

  const cfg = v as Partial<ConfigReady>;
  if (!Array.isArray(cfg.tiers)) return null;

  return cfg as ConfigReady;
}