"use client";

import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { useCallback } from "react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";

const STORAGE_KEY = "ic42n:selected-wallet-adapter";

// Persisted shape (simple + stable)
type PersistedSelection = {
  walletName: WalletName | null; // e.g. "Phantom", "Solflare", "Backpack", "Jupiter"
  publicKey: string | null;      // base58
};

const defaultSelection: PersistedSelection = {
  walletName: null,
  publicKey: null,
};

export const selectedWalletAdapterAtom = atomWithStorage<PersistedSelection>(
  STORAGE_KEY,
  defaultSelection
);

export type SelectedWalletAdapterState = {
  walletName: WalletName | null;
  publicKey: PublicKey | null;

  // easy setters
  setSelectedWallet: (walletName: WalletName | null) => void;
  setSelectedPublicKey: (publicKey: PublicKey | string | null) => void;

  // convenience: set both at once
  setSelection: (sel: PersistedSelection) => void;

  // clear everything
  clearSelection: () => void;
};

export function useSelectedWalletAccount(): SelectedWalletAdapterState {
  const [sel, setSel] = useAtom(selectedWalletAdapterAtom);

  const publicKey = sel.publicKey ? new PublicKey(sel.publicKey) : null;

  const setSelectedWallet = useCallback(
    (walletName: WalletName | null) => {
      setSel((prev) => ({
        ...prev,
        walletName,
        // If the wallet changes, you usually want to clear the old pubkey
        publicKey: walletName ? prev.publicKey : null,
      }));
    },
    [setSel]
  );

  const setSelectedPublicKey = useCallback(
    (pk: PublicKey | string | null) => {
      setSel((prev) => ({
        ...prev,
        publicKey: pk
          ? typeof pk === "string"
            ? pk
            : pk.toBase58()
          : null,
      }));
    },
    [setSel]
  );

  const setSelection = useCallback(
    (next: PersistedSelection) => setSel(next),
    [setSel]
  );

  const clearSelection = useCallback(
    () => setSel(defaultSelection),
    [setSel]
  );

  return {
    walletName: sel.walletName,
    publicKey,
    setSelectedWallet,
    setSelectedPublicKey,
    setSelection,
    clearSelection,
  };
}