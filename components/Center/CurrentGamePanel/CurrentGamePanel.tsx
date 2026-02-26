"use client";

import React, { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import styles from "./CurrentGamePanel.module.scss";

import { CSSVars, HUE_BY_NUMBER } from "@/utils/colors";
import { formatLamportsToSol } from '@/utils/solana_helper';
import VideoBackground from '@/components/ui/VideoBackground/VideoBackground';
import Link from 'next/link';
import Image from 'next/image';
import { latestPredictionsWithProfilesAtom, topPredictionsWithProfilesAtom } from '@/state/prediction-view-atoms';
import { currentPredictionHydrationStatusAtom } from '@/state/prediction-atoms';
import { SelectedNumbers } from '@/components/ui/SelectedNumbers/SelectedNumbers';
type Tab = "latest" | "top";


export default function CurrentGamePanel(props: { limit?: number }) {
  const limit = props.limit ?? 30;

  const [tab, setTab] = useState<Tab>("latest");

  const status = useAtomValue(currentPredictionHydrationStatusAtom);
  const isLoading = status === "loading" || status === "idle";

  const latest = useAtomValue(latestPredictionsWithProfilesAtom);
  const top = useAtomValue(topPredictionsWithProfilesAtom);

  const rows = useMemo(() => {
    const src = tab === "latest" ? latest : top;
    return src.slice(0, limit);
  }, [tab, latest, top, limit]);


  return (
    <div className={styles.panel}>
      {rows.length > 0 ? (
      <div className={styles.header}>
        <button
          className={`${styles.tab} ${tab === "latest" ? styles.active : ""}`}
          onClick={() => setTab("latest")}
          type="button"
        >
          Latest Predictions
        </button>
        <button
          className={`${styles.tab} ${tab === "top" ? styles.active : ""}`}
          onClick={() => setTab("top")}
          type="button"
        >
          Most Committed
        </button>
      </div>
        ): null}

      <div className={styles.list}>
        {rows.length === 0 ? (
            <VideoBackground src="/video/loader-tiny.mp4">
              <div className={styles.emptyStateInner}>
                <div className={styles.emptyTitle}>
                  {isLoading ? "Loading.. " : "Awaiting new predictions"}
                </div>
                <div className={styles.emptySub}>
                  {isLoading
                    ? ""
                    : "A new epoch has begun."}
                </div>
              </div>
            </VideoBackground>

        ) : (
          rows.map((p) => {
            const picks = p.selections ?? [];
            const primary = picks[0] ?? 1;

            const styleVars: CSSVars = {
              "--hue": String(HUE_BY_NUMBER[primary] ?? 50),
            };

            const totalLamports = p.wagerTotalLamports ?? 0n;
            const pickCount = Math.max(1, picks.length);
            const perPickLamports = totalLamports / BigInt(pickCount);

            return (
              <div
                key={p.pubkey.toBase58()}
                className={styles.row}
                style={styleVars}
              >
                <div className={styles.player}>
                  <Link
                    href={`/profile/${p.handle}`}
                    className={styles.pk}
                    style={styleVars}
                    title={p.handle}
                  >
                    {p.handle}
                  </Link>

                  {p.rank != undefined ? (
                    <div className={styles.rank}>
                      <Image
                        src={p.rank.image}
                        alt=""
                        width={22}
                        height={22}
                        className={styles.rank}
                      />
                    </div>
                  ) : null}
                </div>

                <div className={styles.picks}>
                  <SelectedNumbers numbers={picks} size="sm" opacity={0.65} align="end" />
                </div>

                {/* Total amount (optional per-pick) */}
                <div className={styles.amount}>
                  {formatLamportsToSol(totalLamports, 4)} SOL
                  {picks.length > 1 ? (
                    <div className={styles.amountSub}>
                      {formatLamportsToSol(perPickLamports, 4)} ea
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}