"use client";

import { useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import type { CSSVars } from "@/utils/colors";
import { numberToCSSVars } from "@/utils/colors";
import { selectedEpochAtom } from "@/state/selected-epoch-history-atoms";

import {
  winningHistoryListAtom,
  winningHistoryStatusAtom,
  prefetchWinningHistoryAtom,
} from "@/state/winning-history-atoms";

import styles from "./LastWinningNumbers.module.scss";

function SkeletonRow() {
  return (
    <div className={styles.rowSkeleton}>
      <div className={styles.epochSkeleton} />
      <div className={styles.bubbleSkeleton} />
    </div>
  );
}

export function LastWinningNumbers({ limit = 20 }: { limit?: number }) {
  const [selected, setSelected] = useAtom(selectedEpochAtom);

  // Shared cache (ordered list)
  const items = useAtomValue(winningHistoryListAtom);

  // Shared fetch state
  const status = useAtomValue(winningHistoryStatusAtom);

  // Optional safety: request at least `limit` rows if the component needs more than AppShell fetched
  const prefetch = useSetAtom(prefetchWinningHistoryAtom);
  useEffect(() => {
    void prefetch({ limit });
  }, [prefetch, limit]);

  const isCurrentSelected = selected.kind === "current";

  // Only show the skeleton if we have no cached data yet
  const loading = status.loading && items.length === 0;
  const error = !loading ? status.error : null;

  return (
    <div className={styles.container}>
      <div className={styles.title}>History</div>

      {/* Current row (always first) */}
      <div className={styles.rowWrap}>
        <button
          type="button"
          className={`${styles.currentRow} ${
            isCurrentSelected ? styles.activeRow : ""
          }`}
          onClick={() => setSelected({ kind: "current" })}
        >
          <div className={styles.epoch}>Current</div>
        </button>
      </div>

      {/* Loading */}
      {loading &&
        Array.from({ length: Math.min(8, limit) }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}

      {/* Error (only if we truly have nothing to show) */}
      {!loading && error && items.length === 0 && (
        <div className={styles.error}>{error}</div>
      )}

      {/* Data */}
      {items.map((row) => {
        const isActive = selected.kind === "epoch" && selected.epoch === row.epoch;

        const n = row.winningNumber;

        const bubbleVars: CSSVars | undefined =
          n != null ? numberToCSSVars(n) : undefined;

        const rowVars: CSSVars =
          n != null ? numberToCSSVars(n, 0.5) : ({} as CSSVars);

        return (
          <button
            key={row.epoch}
            type="button"
            className={`${styles.row} ${isActive ? styles.activeRow : ""}`}
            style={rowVars}
            onClick={() => setSelected({ kind: "epoch", epoch: row.epoch })}
          >
            <div className={styles.epoch}>{row.epoch}</div>
            <div className={styles.bubble} style={bubbleVars}>
              {n ?? "—"}
            </div>
          </button>
        );
      })}
    </div>
  );
}