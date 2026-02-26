
import { TierSettingsReady } from './tier-atoms';
import { atom } from 'jotai';
import { formatBps } from '@/utils/decoder';

export type ConfigReady = {
  pauseBet: number;            // u8
  pauseWithdraw: number;       // u8
  authority: string;        // Pubkey
  feeVault: string;         // Pubkey
  baseFeeBps: number;          // u16
  betCutoffSlots: bigint;          // u64
  startedAt: bigint;               // i64
  startedEpoch: bigint;            // u64
  primaryRollOverNumber: number; // u8
  tiers: TierSettingsReady[];       // length = 5
  bump: number;                // u8
  minFeeBps: number;           // u16
  rolloverFeeStepBps: number;  // u16
  reserved: Uint8Array;          // u8[16]
};

export type ConfigUI = {
  primaryRollOverNumber: string;
  rolloverFeeStepBps: string;
  minFeeBps: number;
};

export const configAtom = atom<{ pubkey: string; lamports: number; dataLen: number } | null>(null);
export const configReadyAtom = atom<ConfigReady | null>(null);

export const configUIAtom = atom<ConfigUI | null>((get) => {
  const c = get(configReadyAtom);
  if (!c) return null;
  return {
    primaryRollOverNumber: c.primaryRollOverNumber.toString(),
    rolloverFeeStepBps: formatBps(c.rolloverFeeStepBps),
    minFeeBps: c.minFeeBps,
  };
});