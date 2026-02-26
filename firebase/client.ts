// /firebase/client.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signOut,
  signInWithCustomToken,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// ----------------------------
// Auth persistence (call once at startup)
// ----------------------------
let persistenceInitPromise: Promise<void> | null = null;

export function initAuthPersistence() {
  if (!persistenceInitPromise) {
    persistenceInitPromise = setPersistence(auth, browserLocalPersistence).catch((e) => {
      // allow retry if something truly failed
      persistenceInitPromise = null;
      throw e;
    });
  }
  return persistenceInitPromise;
}

// ----------------------------
// Sign out of Firebase
// ----------------------------
export async function firebaseHardSignOut() {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
}

// ----------------------------
// Ensure Firebase auth matches the connected wallet + tier
// - handle should equal Firebase uid (UID IS HANDLE NOT WALLET PUBKEY)
// - tier is required because chat access is tier-scoped
// ----------------------------
export async function ensureFirebaseMatchesWallet(handle: string | null, tier: number) {
  const uid = auth.currentUser?.uid ?? null;

  // no wallet => no auth should exist
  if (!handle) {
    if (uid) await firebaseHardSignOut();
    return;
  }

  // tier must be valid
  if (!(tier >= 1 && tier <= 5)) {
    // don't leave a stale user signed in if tier is invalid
    if (uid) await firebaseHardSignOut();
    throw new Error("Invalid tier");
  }

  // If already signed in as this handle, nothing to do.
  // (If later you want to force re-auth on tier change, we can cache lastTier.)
  if (uid === handle) return;

  // wallet changed but firebase still old user => sign out
  if (uid && uid !== handle) {
    await firebaseHardSignOut();
  }

  // Ensure persistence initialized (safe to call multiple times)
  await initAuthPersistence();

  // Mint custom token via your Next route -> Lambda
  const res = await fetch("/api/auth-bet-tx", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tier, handle }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok || typeof data?.token !== "string") {
    // Not authorized for chat (or other failure). Ensure signed out.
    await firebaseHardSignOut();
    throw new Error(data?.error ?? "Chat authorization failed");
  }

  await signInWithCustomToken(auth, data.token);
}