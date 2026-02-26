"use client";

import { useEffect, useState } from "react";

type SolUsdState = {
  usd: number | null;
  loading: boolean;
  error: string | null;
};

const SOL_MINT = "So11111111111111111111111111111111111111112";

export function useSolUsdSnapshot(open: boolean): SolUsdState {
  const [usd, setUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const ac = new AbortController();

    setLoading(true);
    setError(null);
    setUsd(null);

    (async () => {
      try {
        const r = await fetch(`/api/jup-price?ids=${SOL_MINT}`, {
          signal: ac.signal,
          cache: "no-store",
        });

        if (!r.ok) {
          if (!ac.signal.aborted) setError(`price fetch failed: ${r.status}`);
          return;
        }

        const j = await r.json();

        // v3: keyed by mint address
        const p = j?.[SOL_MINT]?.usdPrice;

        if (typeof p !== "number" || !Number.isFinite(p)) {
          if (!ac.signal.aborted) setError("invalid price payload");
          return;
        }

        if (!ac.signal.aborted) setUsd(p);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open]);

  return { usd, loading, error };
}