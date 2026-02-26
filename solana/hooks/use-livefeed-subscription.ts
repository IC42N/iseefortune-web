"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSetAtom } from "jotai";
import type { AccountInfo } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAtomValue } from "jotai";

import {
  liveFeedAtom,
  liveFeedDecodedAtom,
  liveFeedFXAtom,
} from "@/state/live-feed-atoms";
import type { LiveFeedReady } from "@/state/live-feed-atoms";

import { diffLiveFeed } from "@/live/livefeed-diff";
import { subscribeLiveFeed } from "@/live/livefeed-subscription";
import { getLiveFeedPda } from "@/solana/pdas";
import { decodeLiveFeedFromAccountInfo } from "@/solana/decode/live-feed";

type Params = {
  tier: number;
};

export function useLiveFeedSubscription({ tier }: Params) {
  const { connection } = useConnection();

  const setMeta = useSetAtom(liveFeedAtom);
  const setDecoded = useSetAtom(liveFeedDecodedAtom);
  const setFx = useSetAtom(liveFeedFXAtom);

  const prevRef = useRef<LiveFeedReady | null>(null);
  const pda = useMemo(() => getLiveFeedPda(tier), [tier]);
  const currentDecoded = useAtomValue(liveFeedDecodedAtom);
  const prevTierRef = useRef<number>(tier);

  // reset baseline immediately when tier changes
  if (prevTierRef.current !== tier) {
    prevTierRef.current = tier;
    prevRef.current = null;
  }

  // seed baseline from the decoded state only if it matches this tier
  if (!prevRef.current && currentDecoded && currentDecoded.tier === tier) {
    prevRef.current = currentDecoded;
  }

  useEffect(() => {
    const unsubscribe = subscribeLiveFeed<LiveFeedReady>({
      connection,
      liveFeedPda: pda,
      decode: (accountInfo: AccountInfo<Buffer>) =>
        decodeLiveFeedFromAccountInfo(accountInfo),

      onUpdate: (meta, next) => {
        setMeta(meta);
        setDecoded(next);

        const prev = prevRef.current;
        if (prev) {
          const d = diffLiveFeed(prev, next);
          const now = Date.now();
          setFx((fx) => ({
            ...fx,
            lastUpdateAtMs: now,
            epochChanged: d.epochChanged,
            potDeltaLamports: d.potDeltaLamports,
            betsDelta: d.betsDelta,
            changedLamportsIndices: d.changedLamportsIndices,
            changedBetsIndices: d.changedBetsIndices,
          }));
          if (d.potDeltaLamports > 0n) {
            const clearKey = now;
            window.setTimeout(() => {
              setFx((fx) => {
                // only clear if nothing newer has updated since we set it
                if (fx.lastUpdateAtMs !== clearKey) return fx;
                return { ...fx, potDeltaLamports: 0n };
              });
            }, 1150);
          }
        } else {
          // baseline for this tier
          setFx((fx) => ({
            ...fx,
            lastUpdateAtMs: Date.now(),
            epochChanged: false,
            potDeltaLamports: 0n,
            betsDelta: 0n,
            changedLamportsIndices: [],
            changedBetsIndices: [],
          }));
        }

        prevRef.current = next;
      },

      onError: (e) => {
        console.error("LiveFeed subscription error", e);
      },

      commitment: "processed",
    });

    return () => {
      unsubscribe();
    };
  }, [connection, pda, setDecoded, setFx, setMeta]);

  return null;
}