"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";

/**
 * Chat permission state for the current user + tier.
 *
 * - loading: true while auth state or Firestore marker is resolving
 * - authed: true if a Firebase user is signed in
 * - canChat: true if the bettor marker exists for this tier
 * - uid: Firebase UID (this is the HANDLE, not the wallet pubkey)
 */
type CanChatState =
  | { loading: true; authed: boolean; canChat: false; uid: string | null }
  | { loading: false; authed: boolean; canChat: boolean; uid: string | null };

/**
 * useCanChat
 *
 * Determines whether the current user can chat in a given tier.
 *
 * This hook:
 * - Listens to Firebase auth state (wallet connect / disconnect)
 * - Subscribes to the tier-scoped bettor marker document
 * - Updates instantly when the marker appears or disappears
 *
 * It never throws or blocks UI — lack of access simply means canChat=false.
 */
export function useCanChat(tierId: number) {
  const [state, setState] = useState<CanChatState>({
    loading: true,
    authed: false,
    canChat: false,
    uid: null,
  });

  useEffect(() => {
    const auth = getAuth();

    // Firestore unsubscribe for the bettor marker listener
    let unsubMarker: (() => void) | null = null;

    // Listen for Firebase auth changes (wallet connect / switch / disconnect)
    const unsubAuth = onAuthStateChanged(auth, async (user: User | null) => {
      // Clean up any existing marker listener when auth changes
      if (unsubMarker) {
        unsubMarker();
        unsubMarker = null;
      }

      // Not signed in => cannot chat
      if (!user) {
        setState({
          loading: false,
          authed: false,
          canChat: false,
          uid: null,
        });
        return;
      }

      // Firebase UID === chat handle (not full wallet pubkey)
      const uid = user.uid;

      // Optimistically mark authed while we check chat access
      setState({
        loading: true,
        authed: true,
        canChat: false,
        uid,
      });

      // Subscribe to the tier-scoped bettor marker
      const db = getFirestore();
      const ref = doc(db, `rooms/tier${tierId}/players/${uid}`);

      unsubMarker = onSnapshot(
        ref,
        (snap) => {
          // Marker exists => user can chat
          setState({
            loading: false,
            authed: true,
            canChat: snap.exists(),
            uid,
          });
        },
        () => {
          // If read fails (rules, network, etc), treat as no chat access
          setState({
            loading: false,
            authed: true,
            canChat: false,
            uid,
          });
        }
      );
    });

    // Cleanup on unmount or tier change
    return () => {
      unsubAuth();
      if (unsubMarker) unsubMarker();
    };
  }, [tierId]);

  return state;
}