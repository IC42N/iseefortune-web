import { NextResponse } from "next/server";
import { adminDb, adminAuth, firebaseAdmin } from "../../_shared/firebase-admin";

type Body = {
  tierId: number;
  text: string;
};

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

export async function POST(req: Request) {
  try {
    // ----------------------------
    // Auth
    // ----------------------------
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // ----------------------------
    // Body validation
    // ----------------------------
    const body = (await req.json()) as Partial<Body>;

    const tierId = Number(body.tierId);
    if (!Number.isInteger(tierId) || tierId < 1 || tierId > 5) {
      return badRequest("Invalid tierId");
    }

    const text = typeof body.text === "string" ? body.text : "";
    const trimmed = text.trim();
    if (trimmed.length < 1) return badRequest("Message is empty");
    if (trimmed.length > 280) return badRequest("Message too long");

    // ----------------------------
    // Membership check (authoritative)
    // ----------------------------
    const playerRef = adminDb.doc(`rooms/tier${tierId}/players/${uid}`);
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Not allowed to chat in this tier" },
        { status: 403 }
      );
    }

    // ----------------------------
    // Rate limit + write (atomic)
    // ----------------------------
    const nowMs = Date.now();
    const rateRef = adminDb.doc(`rooms/tier${tierId}/rate_limits/${uid}`);
    const messagesCol = adminDb.collection(`rooms/tier${tierId}/messages`);

    await adminDb.runTransaction(async (tx) => {
      const rateSnap = await tx.get(rateRef);
      const nextAllowed =
        (rateSnap.data()?.next_allowed_ms as number | undefined) ?? 0;

      if (nowMs < nextAllowed) {
        const err = new Error("RATE_LIMIT");
        (err as { retryAfterMs?: number }).retryAfterMs = nextAllowed - nowMs;
        throw err;
      }

      // Update rate limit
      tx.set(
        rateRef,
        {
          next_allowed_ms: nowMs + 2000, // cooldown
          updated_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Write message
      const msgRef = messagesCol.doc();
      tx.set(msgRef, {
        kind: "chat",
        tier: tierId,
        created_by: uid,
        text: trimmed,
        created_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        sort_key: nowMs,
      });
    });

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (e: unknown) {
    // Rate limit handling
    if (e instanceof Error && e.message === "RATE_LIMIT") {
      const retryAfterMs =
        (e as { retryAfterMs?: number }).retryAfterMs;

      return NextResponse.json(
        { ok: false, error: "Too many messages", retry_after_ms: retryAfterMs },
        { status: 429 }
      );
    }

    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}