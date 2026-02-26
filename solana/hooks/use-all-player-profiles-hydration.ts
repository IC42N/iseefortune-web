"use client";

import { useEffect, useMemo, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAtomValue, useSetAtom } from "jotai";
import { PublicKey } from "@solana/web3.js";
import {
  upsertPlayerProfilesAtom,
  markPlayersRequestedAtom,
  requestedPlayersSetAtom,
} from "@/state/player-profile-atoms";

import { decodePlayerProfile } from "@/solana/decode/player-profile";
import { getProfilePda } from '@/solana/pdas';
import { lastPlayerPredictionsAtom, topPlayerPredictionsAtom } from '@/state/prediction-atoms';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useAllPlayerProfilesHydration(opts?: { limit?: number; chunkSize?: number }) {
  const limit = opts?.limit ?? 40;
  const chunkSize = opts?.chunkSize ?? 75;

  const { connection } = useConnection();

  const latest = useAtomValue(lastPlayerPredictionsAtom);
  const top = useAtomValue(topPlayerPredictionsAtom);

  const requested = useAtomValue(requestedPlayersSetAtom);
  const markRequested = useSetAtom(markPlayersRequestedAtom);
  const upsertProfiles = useSetAtom(upsertPlayerProfilesAtom);

  // Only cancel on unmounting
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Prevent starting the same fetch twice (StrictMode / rerenders)
  const inflightRef = useRef<Set<string>>(new Set());

  const playersNeeded = useMemo(() => {
    const visible = [...latest.slice(0, limit), ...top.slice(0, limit)];
    const uniq = new Set<string>();
    for (const b of visible) uniq.add(b.player.toBase58());
    return Array.from(uniq).filter((pk) => !requested.has(pk));
  }, [latest, top, limit, requested]);

  useEffect(() => {
    if (playersNeeded.length === 0) return;

    // build a stable key for this "job"
    const jobKey = playersNeeded.join("|");
    if (inflightRef.current.has(jobKey)) return;
    inflightRef.current.add(jobKey);

    //console.log("profile hydration starting", playersNeeded.length);

    // mark requested (this will cause rerender, but we won't cancel fetch)
    markRequested({ players: playersNeeded });

    (async () => {
      try {
        const pdaList = playersNeeded.map((p) =>
          getProfilePda(new PublicKey(p))
        );

        const batches = chunk(pdaList, chunkSize);
        const decodedProfiles = [];

        // let missing = 0;
        // let decodeFailed = 0;

        for (const batch of batches) {
          const infos = await connection.getMultipleAccountsInfo(batch, { commitment: "processed" });

          for (let i = 0; i < infos.length; i++) {
            const info = infos[i];
            const pda = batch[i]!;

            if (!info?.data) {
              //missing++;
              continue;
            }

            try {
              decodedProfiles.push(decodePlayerProfile(pda, info.data));
            } catch (e) {
              //decodeFailed++;
              console.warn("decode failed pda", pda.toBase58(), "len", info.data.length, e);
            }
          }
        }

        // console.log("profile hydration results", {
        //   requested: playersNeeded.length,
        //   missing,
        //   decodeFailed,
        //   decoded: decodedProfiles.length,
        // });


        if (!mountedRef.current) return;
        //console.log("profile hydration decoded", decodedProfiles.length);

        if (decodedProfiles.length > 0) {
          upsertProfiles({ profiles: decodedProfiles });
        }
      } catch (e) {
        console.warn("profile hydration failed", e);
      } finally {
        inflightRef.current.delete(jobKey);
      }
    })();
  }, [connection, playersNeeded, chunkSize, markRequested, upsertProfiles]);
}