"use client";

import { useAtomValue } from "jotai";
import { epochNoticesAtom } from "@/state/epoch-clock-atoms";

export function EpochNoticesToaster() {
  const notices = useAtomValue(epochNoticesAtom);

  if (notices.length === 0) return null;

  // simplest: show latest only
  const n = notices[0];

  return (
    <div style={{
      position: "fixed",
      top: 16,
      right: 16,
      zIndex: 9999,
      padding: 12,
      borderRadius: 12,
      background: "rgba(10,10,12,0.85)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "white",
      maxWidth: 320,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ fontSize: 13, opacity: 0.8 }}>System</div>
      <div style={{ fontSize: 14, marginTop: 4 }}>{n.text}</div>
    </div>
  );
}