"use client";

import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import type { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { walletBalanceAtom, walletPublicKeyAtom } from '@/state/wallet-atoms';

const COMMITMENT = "confirmed" as const;

export function useSyncWalletBalanceToAtom(publicKey: PublicKey | null) {
  const { connection } = useConnection();
  const setWalletPk = useSetAtom(walletPublicKeyAtom);
  const setLamports = useSetAtom(walletBalanceAtom);

  const lastSlotRef = useRef<number>(-1);
  const subIdRef = useRef<number | null>(null);

  useEffect(() => {
    setWalletPk(publicKey ? publicKey.toBase58() : null);

    // Always kill any previous listener before starting a new one
    if (subIdRef.current != null) {
      void connection.removeAccountChangeListener(subIdRef.current);
      subIdRef.current = null;
    }

    if (!publicKey) {
      setLamports({lamports: null,fetchedAtMs : null,status:'idle'});
      lastSlotRef.current = -1;
      return;
    }

    // New wallet => new slot timeline
    lastSlotRef.current = -1;

    let cancelled = false;

    (async () => {
      try {
        const res = await connection.getBalanceAndContext(publicKey, COMMITMENT);
        if (cancelled) return;

        const slot = res.context.slot;
        if (slot >= lastSlotRef.current) {
          lastSlotRef.current = slot;
          setLamports({lamports:res.value,fetchedAtMs:Date.now(),status:'ready'});
        }
      } catch {
        // intentionally minimal
      }
    })();

    const subIdPromise = connection.onAccountChange(
      publicKey,
      (info, ctx) => {
        const slot = ctx.slot;
        if (slot < lastSlotRef.current) return;
        lastSlotRef.current = slot;
        setLamports({lamports:info.lamports,fetchedAtMs:Date.now(),status:'ready'});
      },
      { commitment: "confirmed" }
    );

    Promise.resolve(subIdPromise).then((id) => {
      if (cancelled) {
        void connection.removeAccountChangeListener(id);
        return;
      }
      subIdRef.current = id;
    });

    return () => {
      cancelled = true;
      if (subIdRef.current != null) {
        void connection.removeAccountChangeListener(subIdRef.current);
        subIdRef.current = null;
      }
    };
  }, [connection, publicKey, setLamports, setWalletPk]);
}