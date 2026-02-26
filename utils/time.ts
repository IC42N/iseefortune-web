
// Relative time formatting for timestamps from BigInt
export function formatRelativeTimeFromBigInt(ts: bigint): string {
  const now = Date.now();
  const then = Number(ts) * 1000;
  const diff = Math.floor((now - then) / 1000);

  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Relative time formatting for timestamps in seconds
export function formatRelativeTime(seconds: number) {
  const now = Date.now();
  const then = seconds * 1000;
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatAbsFromUnixSeconds(tsSec: bigint) {
  return new Date(Number(tsSec) * 1000).toLocaleString();
}

export function formatCreatedAt(ms: number): string {
  if (!ms) return "";

  const d = new Date(ms);
  const now = new Date();

  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isSameDay) {
    return d.toLocaleTimeString([], {
      hour: "numeric",   // 👈 no leading zero
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isYesterday) {
    return "Yesterday";
  }

  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}


export function fmtTsSeconds(tsStr: string): string {
  // you stored i64 seconds as string (or maybe ms). If it looks too big, treat as ms.
  const n = Number(tsStr);
  if (!Number.isFinite(n)) return "—";

  const ms = n > 9_999_999_999 ? n : n * 1000; // crude but works well
  const d = new Date(ms);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}







export function bigintUnixSecondsToLocalString(ts: bigint): string {
  if (!ts || ts === 0n) return "—";

  const ms = Number(ts) * 1000;
  return new Date(ms).toLocaleString();
}