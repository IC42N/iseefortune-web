"use client";

import { useEffect, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAtomValue, useSetAtom } from "jotai";

import { appReadyAtom, epochAtom, requestBootstrapRefreshAtom } from '@/state/global-atoms';
import { requestEpochResetAtom } from '@/state/reset-game-atoms';
import { epochResultsModalAtom } from '@/state/epoch-clock-atoms';

export function useEpochRollover() {
  const appReady = useAtomValue(appReadyAtom);
  const epoch = useAtomValue(epochAtom);
  const { connection } = useConnection();

  const requestBootstrapRefresh = useSetAtom(requestBootstrapRefreshAtom);
  const requestEpochReset = useSetAtom(requestEpochResetAtom);
  const modal = useAtomValue(epochResultsModalAtom);

  const lastSeenEpochRef = useRef<number | null>(null);

  useEffect(() => {
    if (!appReady || !epoch) return;

    lastSeenEpochRef.current = epoch.epoch;

    let cancelled = false;
    let subId: number | null = null;

    const check = async () => {
      if (cancelled) return;

      try {
        const ei = await connection.getEpochInfo();
        const last = lastSeenEpochRef.current;

        if (last != null && ei.epoch !== last) {
          // 👇 NEW: do not reset if the results modal is open
          if (modal?.open) {
            // Keep lastSeenEpochRef as-is so we’ll retry later
            return;
          }

          lastSeenEpochRef.current = ei.epoch;
          requestEpochReset();
          requestBootstrapRefresh();
        }
      } catch {}
    };

    // Light-touch: only start checking after we pass the epochEndSlot
    const onSlot = (slot: number) => {
      if (!epoch) return;

      // epochEndSlot is already computed in your epochAtom
      if (slot >= epoch.epochEndSlot) {

        // start polling epochInfo until it flips
        void check();
      }
    };

    subId = connection.onSlotChange((info) => onSlot(info.slot));

    // also run once on mount in case we loaded late
    void check();

    return () => {
      cancelled = true;
      if (subId != null) void connection.removeSlotChangeListener(subId);
    };
  }, [appReady, epoch, connection, requestEpochReset, requestBootstrapRefresh, modal?.open]);
}