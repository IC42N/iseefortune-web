import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { sendConnection } from "@/solana/tx/send-connection";
import { generateHandleFromWalletPubKey } from '@/utils/profile';

type AuthOk = {
  ok: true;
  token: string;
  pubkey: string;
  wrote_bettor_marker: boolean;
};

type AuthErr = {
  ok: false;
  error: string;
};

type AuthFromBetTxResponse = AuthOk | AuthErr;

async function waitForConfirm(signature: string, timeoutMs = 60_000) {
  const start = Date.now();
  let delay = 250;

  while (true) {
    const st = await sendConnection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });

    const s = st.value[0];

    if (s?.err) throw new Error("Bet transaction failed");

    const cs = s?.confirmationStatus;
    if (cs === "confirmed" || cs === "finalized") return;

    const confirmations =
      (s as { confirmations?: number | null } | null)?.confirmations;

    if (typeof confirmations === "number" && confirmations > 0) return;

    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for confirmed confirmation");
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(1000, Math.floor(delay * 1.25));
  }
}

function safeParseAuthResponse(rawText: string): AuthFromBetTxResponse | null {
  try {
    const obj: unknown = JSON.parse(rawText);
    if (typeof obj !== "object" || obj === null) return null;

    if (!("ok" in obj)) return null;
    const okVal = (obj as { ok?: unknown }).ok;

    if (okVal === true) {
      const o = obj as Partial<AuthOk>;
      if (typeof o.token === "string" && typeof o.pubkey === "string") {
        return {
          ok: true,
          token: o.token,
          pubkey: o.pubkey,
          wrote_bettor_marker: !!o.wrote_bettor_marker,
        };
      }
      return null;
    }

    if (okVal === false) {
      const o = obj as Partial<AuthErr>;
      if (typeof o.error === "string") {
        return { ok: false, error: o.error };
      }
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function afterBetAuth({
 txSig,
 tier,
}: {
  txSig: string;
  tier: number;
}) {
  // 1) Wait for confirmed (matches your Lambda)
  await waitForConfirm(txSig);
  await new Promise((r) => setTimeout(r, 500));

  // 2) Call your Next.js /api route
  const res = await fetch("/api/auth-bet-tx", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tx_sig: txSig, tier }),
  });

  const rawText = await res.text();
  const parsed = safeParseAuthResponse(rawText);

  // If server returned a non-2xx, include the best message we can
  if (!res.ok) {
    const msg =
      parsed && !parsed.ok ? parsed.error : rawText || `HTTP ${res.status}`;
    throw new Error(`Auth-from-bet-tx failed: ${msg}`);
  }

  // If 2xx but body isn't what we expect
  if (!parsed) {
    throw new Error("Auth-from-bet-tx returned unexpected response");
  }

  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  // Get Handle
  const handle = generateHandleFromWalletPubKey(parsed.pubkey);


  // 3) Firebase sign-in (authoritative)
  const auth = getAuth();

  // If signed in as someone else, sign out first
  const currentUid = auth.currentUser?.uid ?? null;
  if (currentUid && currentUid !== handle) {
    await signOut(auth);
  }

  // If not signed in (or wrong user), sign in and trust the returned credential
  if (!auth.currentUser || auth.currentUser.uid !== handle) {
    const cred = await signInWithCustomToken(auth, parsed.token);

    // Authoritative check
    if (cred.user.uid !== handle) {
      throw new Error(
        `Firebase auth mismatch after sign-in (got ${cred.user.uid}, expected ${handle})`
      );
    }

    // Optional but useful if you immediately call protected APIs
    await cred.user.getIdToken(true);
  }

  return parsed;
}