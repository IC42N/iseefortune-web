"use client";

import { useEffect, useRef, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection } from '@solana/web3.js';

type Opts = {
  pollMs?: number;
  commitment?: "processed" | "confirmed" | "finalized";
  maxBackoffMs?: number;
  debug?: boolean; // ✅ add debug toggle
};

export function useCurrentSlot(opts: Opts = {}) {
  const {
    pollMs = 1500,
    commitment = "confirmed",
    maxBackoffMs = 15_000,
    debug = false,
  } = opts;

  const { connection } = useConnection();
  const [slot, setSlot] = useState<number | null>(null);

  const subIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const backoffRef = useRef(0);
  const usingWsRef = useRef(false);


  useEffect(() => {

    const log = (...args: unknown[]) => {
      if (!debug) return;
      // keep logs easy to grep in the console
      //console.log("[useCurrentSlot]", ...args);
    };

    cancelledRef.current = false;
    backoffRef.current = 0;
    usingWsRef.current = false;

    log("mount", {
      endpoint: (connection as Connection)?.rpcEndpoint,
      pollMs,
      commitment,
      maxBackoffMs,
    });

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const stopWs = async () => {
      const id = subIdRef.current;
      subIdRef.current = null;
      usingWsRef.current = false;

      if (id != null) {
        try {
          await connection.removeSlotChangeListener(id);
          log("ws: removed slot listener", id);
        } catch (e) {
          log("ws: remove listener failed", e);
        }
      }
    };

    const schedulePoll = (delay: number) => {
      clearTimer();
      if (cancelledRef.current) return;
      timerRef.current = setTimeout(pollTick, delay);
      log("poll: scheduled", { delay });
    };

    const pollTick = async () => {
      if (cancelledRef.current) return;

      try {
        const s = await connection.getSlot(commitment);
        if (!cancelledRef.current) setSlot(s);

        if (backoffRef.current !== 0) log("poll: recovered");
        backoffRef.current = 0;

        log("poll: tick ok", { slot: s });
        schedulePoll(pollMs);
      } catch (e) {
        backoffRef.current = backoffRef.current
          ? Math.min(maxBackoffMs, backoffRef.current * 2)
          : Math.min(maxBackoffMs, pollMs * 2);

        log("poll: tick failed -> backoff", {
          backoffMs: backoffRef.current,
          error: e,
        });

        schedulePoll(backoffRef.current);
      }
    };

    const startWsOrFallback = async () => {
      // Get an initial slot quickly (even if WS succeeds)
      try {
        const s = await connection.getSlot(commitment);
        if (!cancelledRef.current) setSlot(s);
        log("initial getSlot ok", { slot: s });
      } catch (e) {
        log("initial getSlot failed", e);
      }

      // Try websocket subscription
      try {
        const subId = connection.onSlotChange((info) => {
          if (cancelledRef.current) return;
          setSlot(info.slot);

          // only log occasionally to avoid spam
          if (debug && info.slot % 50 === 0) {
            log("ws: slot update", { slot: info.slot });
          }
        });

        subIdRef.current = subId;
        usingWsRef.current = true;
        clearTimer();

        log("ws: subscribed", { subId });
      } catch (e) {
        usingWsRef.current = false;
        log("ws: subscribe failed -> polling", e);
        schedulePoll(0);
      }
    };

    void startWsOrFallback();

    return () => {
      cancelledRef.current = true;
      clearTimer();
      void stopWs();
      log("unmount");
    };
  }, [connection, pollMs, commitment, maxBackoffMs, debug]);

  return slot;
}