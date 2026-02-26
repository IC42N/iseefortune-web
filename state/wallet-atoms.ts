import { atom } from "jotai";
import type { Connection, PublicKey } from "@solana/web3.js";
import { errorToMessage } from '@/utils/error';

export type WalletBalanceState = {
  lamports: number | null;
  fetchedAtMs: number | null;
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
};

export const walletPublicKeyAtom = atom<string | null>(null);
export const walletBalanceAtom = atom<WalletBalanceState>({
  lamports: null,
  fetchedAtMs: null,
  status: "idle",
});

export const refreshWalletBalanceAtom = atom(
  null,
  async (
    _get,
    set,
    args: { connection: Connection; wallet: PublicKey }
  ): Promise<number> => {
    set(walletBalanceAtom, (prev) => ({
      ...prev,
      status: "loading",
      error: undefined,
    }));

    try {
      const lamportsNum = await args.connection.getBalance(args.wallet, "confirmed");

      set(walletBalanceAtom, {
        lamports:lamportsNum,
        fetchedAtMs: Date.now(),
        status: "ready",
      });
      return lamportsNum;
    } catch (e: unknown) {
      const message = errorToMessage(e);
      set(walletBalanceAtom, (prev) => ({
        ...prev,
        status: "error",
        error: message,
      }));
      throw new Error(message);
    }
  }
);