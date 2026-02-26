"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useSelectedWalletAccount } from "@/solana/selected-wallet-account-jotai";
import { useSyncWalletBalanceToAtom } from "@/solana/wallet-balance";
import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useLiveFeedSubscription } from "@/solana/hooks/use-livefeed-subscription";
import { selectedTierAtom } from "@/state/tier-atoms";
import { myPlayerAtom, myProfileAtom, resetProfileWalletCacheAtom } from '@/state/player-profile-atoms';
import { useAllPlayerProfilesHydration } from "@/solana/hooks/use-all-player-profiles-hydration";
import { useMyProfile } from "@/solana/hooks/use-my-profile";
import { useMyProfileStats } from "@/solana/hooks/useMyProfileStats";
import { ensureFirebaseMatchesWallet, firebaseHardSignOut } from '@/firebase/client';
import { generateHandleFromWalletPubKey } from '@/utils/profile';
import { usePredictionSubscription } from '@/solana/hooks/use-prediction-subscription';
import { useMyRecentPredictionsSync } from '@/solana/hooks/use-my-recent-predictions-sync';
import { resetPredictionWalletCacheAtom } from '@/state/prediction-atoms';

export function WalletSync() {
  const last = useRef<{ name: string | null; pk: string | null }>({ name: null, pk: null });
  const setMyPlayer = useSetAtom(myPlayerAtom);
  const myProfile = useAtomValue(myProfileAtom);
  const tier = useAtomValue(selectedTierAtom);
  const resetPredictionWalletCache = useSetAtom(resetPredictionWalletCacheAtom);
  const resetProfileWalletCache = useSetAtom(resetProfileWalletCacheAtom);

  const lastSeenPkRef = useRef<string | null>(null);
  const authRunRef = useRef(0);

  const { wallet, publicKey } = useWallet();
  useSyncWalletBalanceToAtom(publicKey);
  const { setSelection, clearSelection } = useSelectedWalletAccount();

  useLiveFeedSubscription({ tier });
  usePredictionSubscription({ tier });
  useAllPlayerProfilesHydration({ limit: 40 });

  // My Profile
  useMyProfile({ subscribe: true });
  useMyRecentPredictionsSync({ limit: 40 }); // sets all bets to myRecentPredictionsAtom.


  const shouldFetchStats = !!publicKey && !!myProfile && myProfile.totalGames > 0n;
  useMyProfileStats(shouldFetchStats);  // Up until here 100% works

  useEffect(() => {
    const name = wallet?.adapter?.name ?? null;
    const pk = publicKey?.toBase58() ?? null;

    const prevSeenPk = lastSeenPkRef.current;
    const switchedAccounts = !!pk && !!prevSeenPk && pk !== prevSeenPk;

    const runId = ++authRunRef.current;

    const lockEverything = () => {
      setMyPlayer(null);
      clearSelection();
      resetPredictionWalletCache();
      resetProfileWalletCache();
    };

    // DISCONNECTED (including “switching” transient disconnect)
    if (!name || !pk) {
      lockEverything();
      // IMPORTANT: do NOT clear lastSeenPkRef here.
      // Let it persist so the next connect can be detected as a switch.
      return;
    }

    // CONNECTED
    // Treat “first connect” OR “switched after transient disconnect” the same:
    if (!prevSeenPk || switchedAccounts) {
      lockEverything();
      setMyPlayer(publicKey);
      setSelection({ walletName: name, publicKey: pk });
      last.current = { name, pk };
      lastSeenPkRef.current = pk;
      (async () => {
        // hard kill old firebase session first
        await firebaseHardSignOut().catch(() => {});
        if (authRunRef.current !== runId) return;

        await ensureFirebaseMatchesWallet(generateHandleFromWalletPubKey(pk), tier).catch(() => {});
        if (authRunRef.current !== runId) return;
      })();

      return;
    }

    // normal steady-state connect (no switch)
    setMyPlayer(publicKey);
    setSelection({ walletName: name, publicKey: pk });
    last.current = { name, pk };
    lastSeenPkRef.current = pk;
  }, [
    wallet,
    publicKey,
    tier,
    setSelection,
    clearSelection,
    setMyPlayer,
    resetPredictionWalletCache,
    resetProfileWalletCache,
  ]);

  return null;
}