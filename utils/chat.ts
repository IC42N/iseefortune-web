"use client";

import { getAuth } from "firebase/auth";

type SendChatOk = { ok: true };
type SendChatErr = { ok: false; error: string };
type SendChatResponse = SendChatOk | SendChatErr;

export async function sendChatMessage(tierId: number, text: string) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const trimmed = text.trim().slice(0,280);
  if (!trimmed) return;

  const token = await user.getIdToken();

  const res = await fetch("/api/chat/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tierId, text: trimmed }),
  });

  const raw = await res.text();
  let data: SendChatResponse | null = null;
  try {
    data = JSON.parse(raw) as SendChatResponse;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = data && !data.ok ? data.error : raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // if your API returns {ok:true}, you can optionally assert it:
  if (data && "ok" in data && data.ok !== true) {
    throw new Error("Unexpected response from server");
  }
}