"use client";

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { configReadyAtom, ConfigReady } from '@/state/config-atoms';
import { formatBps } from '@/utils/decoder';
import { formatLamportsToSolNumber } from '@/utils/solana_helper';
import { BootStatus } from '@/state/global-atoms';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// If the tier is loaded, technically so is the live feed, but we use tier boot ready instead of
// live feed ready because most UI needs tier to be ready to load.
export const tierBootAtom = atom<BootStatus>({ status: "idle" });
export const tierReadyAtom = atom((get) => get(tierBootAtom).status === "ready");

export const selectedTierAtom = atomWithStorage<number>("ic42n:selected-tier", 1);

export type TierSettingsReady = {
  tier_id: number;
  active: number;
  min_bet_lamports: bigint;
  max_bet_lamports: bigint;
  curve_factor: number;
  ticket_reward_bps: number;
  ticket_reward_max: number;
  tickets_rewarded: number;
  reserved: Uint8Array
};


export type TierSettingsUI = {
  tierId: number;
  tierIdString: string;
  activeLabel: string;
  minBet: bigint;
  maxBet: bigint;
  minBetString: string;
  maxBetString: string;
  minSol: number;
  maxSol: number;
  rangeDisplay: string;
  curveFactor: string;
  ticketReward: string;
  ticketsRewarded: string;
};


function getActiveTiersFromConfig(cfg: ConfigReady): number[] {

  const tiers = cfg?.tiers;

  if (!Array.isArray(tiers)) return [1];

  const active: number[] = [];
  for (const t of tiers) {
    if (t.active) active.push(t.tier_id);
  }

  // Always return something sane
  return active.length ? active : [1];
}

export const availableTiersAtom = atom<number[]>((get) => {
  const cfg = get(configReadyAtom);
  if (!cfg) return [];
  return getActiveTiersFromConfig(cfg);
});


export const selectedTierSettingsAtom = atom<TierSettingsReady | null>((get) => {
  const cfg = get(configReadyAtom);
  const tier = get(selectedTierAtom);

  if (!cfg?.tiers?.length) return null;
  return cfg.tiers.find((t) => t.tier_id === tier) ?? null;
});

export const selectedTierSettingsUiAtom = atom<TierSettingsUI | null>((get) => {
  const t = get(selectedTierSettingsAtom);
  if (!t) return null;

  const minBitNumber = formatLamportsToSolNumber(Number(t.min_bet_lamports));
  const maxBitNumber = formatLamportsToSolNumber(Number(t.max_bet_lamports));

  return {
    tierId: t.tier_id,
    tierIdString: String(t.tier_id ?? "—"),
    activeLabel: t.active === 1 ? "Active" : "Inactive",
    minBet: t.min_bet_lamports,
    maxBet: t.max_bet_lamports,
    minBetString: minBitNumber,
    maxBetString: maxBitNumber,
    minSol: Number(t.min_bet_lamports) / LAMPORTS_PER_SOL,
    maxSol: Number(t.max_bet_lamports) / LAMPORTS_PER_SOL,
    rangeDisplay: `${minBitNumber.toString()} ~ ${maxBitNumber.toString()} SOL`,
    curveFactor: t.curve_factor != null ? String(t.curve_factor) : "—",
    ticketReward: formatBps(t.ticket_reward_bps),
    ticketsRewarded:
      t.tickets_rewarded != null ? t.tickets_rewarded.toLocaleString() : "—",
  };
});