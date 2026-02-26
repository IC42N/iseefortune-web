"use client";

import { useEffect, useMemo, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAtomValue, useSetAtom } from "jotai";
import { PublicKey } from "@solana/web3.js";
import { epochResultsModalAtom } from "@/state/epoch-clock-atoms";
import { latestResolvedGameDisplayAtom } from "@/state/resolved-game-atoms";
import { getResolvedGamePda } from "@/solana/pdas";
import { fetchResolvedGameDecoded } from "@/solana/fetch/fetch-resolved-game";
import { Cluster } from "@/solana/chain-context";
import { toResolvedGameUI } from "@/solana/map/resolved-game";
import { toResolvedGameUIDisplay } from "@/solana/format/resolved-game-displays";
import { ResolvedGameUIDisplay } from '@/state/resolved-game-types';


type Args = {
  tier: number | null;
  cluster?: Cluster;
  enabled?: boolean;
  pollMs?: number; // fallback polling interval
};

export function useResolvedGameFinaleWatcher({
 tier,
 cluster = "mainnet",
 enabled = true,
 pollMs = 1500,
}: Args) {
  const { connection } = useConnection();

  const modal = useAtomValue(epochResultsModalAtom);
  const setLatestDisplay = useSetAtom(latestResolvedGameDisplayAtom);

  const modalEpochBigint = useMemo(() => {
    if (!modal.open || modal.epoch == null) return null;
    // epoch is safe as bigint
    return BigInt(modal.epoch);
  }, [modal.open, modal.epoch]);

  const pdaStr = useMemo(() => {
    if (modalEpochBigint == null || tier == null) return null;
    return getResolvedGamePda(modalEpochBigint, tier);
  }, [modalEpochBigint, tier]);

  // Avoid concurrent fetch storms (WS + polling can both fire)
  const inflightRef = useRef(false);
  const doneRef = useRef(false);
  const sessionRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (!modal.open) return;
    if (modalEpochBigint == null || tier == null) return;
    if (!pdaStr) return;

    doneRef.current = false;
    inflightRef.current = false;

    const session = ++sessionRef.current;

    let alive = true;
    let subId: number | null = null;
    let pollId: number | null = null;

    const pda = new PublicKey(pdaStr);

    const safeSetLatestDisplay = (v : ResolvedGameUIDisplay) => {
      if (sessionRef.current === session) setLatestDisplay(v);
    };

    const tryFetchOnce = async () => {
      if (!alive) return;
      if (doneRef.current) return;
      if (inflightRef.current) return;

      inflightRef.current = true;
      try {
        const decoded = await fetchResolvedGameDecoded({
          epoch: modalEpochBigint,
          tier,
          cluster,
        });

        if (sessionRef.current !== session) return;
        if (!alive || doneRef.current) return;

        if (!decoded) return;

        const ui = toResolvedGameUI(decoded);
        const display = toResolvedGameUIDisplay(ui);

        safeSetLatestDisplay(display);

        if (ui.status_code === 2) {
          doneRef.current = true;
          if (subId != null) void connection.removeAccountChangeListener(subId);
          if (pollId != null) window.clearInterval(pollId);
        }
      } catch {
        // keep trying
      } finally {
        inflightRef.current = false;
      }
    };

    void tryFetchOnce();

    subId = connection.onAccountChange(pda, () => void tryFetchOnce(), {
      commitment: "confirmed",
    });

    pollId = window.setInterval(() => void tryFetchOnce(), pollMs);

    return () => {
      alive = false;
      doneRef.current = true;
      if (subId != null) void connection.removeAccountChangeListener(subId);
      if (pollId != null) window.clearInterval(pollId);
    };
  }, [enabled, modal.open, modalEpochBigint, tier, cluster, pollMs, pdaStr, connection, setLatestDisplay]);
}