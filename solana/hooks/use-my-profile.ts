"use client";

import { useEffect, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAtomValue, useSetAtom } from "jotai";
import type { AccountInfo } from "@solana/web3.js";

import { myPlayerAtom, upsertPlayerProfilesAtom } from '@/state/player-profile-atoms';
import { decodePlayerProfile } from "@/solana/decode/player-profile";
import { getProfilePda } from '@/solana/pdas';
// import { derivePlayerProfilePda } from '@/solana/profile';
// import { PROGRAM_ID } from '@/solana/constants';

/**
 * Loads the connected wallet's PlayerProfile and keeps it updated.
 *
 * - Fetches once on connection
 * - Optionally subscribes to changes for live updates
 * - Upserts into the same profile cache used for other players
 */
export function useMyProfile(opts?: { subscribe?: boolean }) {
  const subscribe = opts?.subscribe ?? true;

  const { connection } = useConnection();
  const myPlayer = useAtomValue(myPlayerAtom);

  const upsertProfiles = useSetAtom(upsertPlayerProfilesAtom);

  const subIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // clean up any previous subscription
    if (subIdRef.current != null) {
      connection.removeAccountChangeListener(subIdRef.current).catch(() => {});
      subIdRef.current = null;
    }

    if (!myPlayer) return;
    const profilePda = getProfilePda(myPlayer);

    async function loadOnce() {
      try {
        const info = await connection.getAccountInfo(profilePda, {
          commitment: "confirmed",
        });

        //console.log("useMyProfile loaded", profilePda.toBase58(), "len", info?.data?.length ?? 0);

        if (cancelled) return;
        if (!info?.data) {
          // Profile might not exist yet (new wallet)
          return;
        }
        const decoded = decodePlayerProfile(profilePda, info.data);
        upsertProfiles({ profiles: [decoded] });
      } catch (e) {
        console.warn("my profile load failed", e);
      }
    }

    void loadOnce();

    if (subscribe) {
      try {
        const id = connection.onAccountChange(
          profilePda,
          (info: AccountInfo<Buffer>) => {
            if (cancelled) return;

            try {
              const decoded = decodePlayerProfile(profilePda, info.data);
              upsertProfiles({ profiles: [decoded] });
            } catch (e) {
              console.warn("my profile decode failed", e);
            }
          },
          { commitment: "confirmed" }
        );

        if (!cancelled) subIdRef.current = id;
      } catch (e) {
        console.warn("my profile subscription failed", e);
      }
    }

    return () => {
      cancelled = true;
      if (subIdRef.current != null) {
        connection.removeAccountChangeListener(subIdRef.current).catch(() => {});
        subIdRef.current = null;
      }
    };
  }, [connection, myPlayer, subscribe, upsertProfiles]);
}