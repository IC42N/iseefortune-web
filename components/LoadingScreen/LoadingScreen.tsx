"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./LoadingScreen.module.scss";
import type { AppBoot } from "@/state/global-atoms";
import Image from "next/image";

export default function LoadingScreen({ boot }: { boot: AppBoot }) {
  const [shown, setShown] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [hidden, setHidden] = useState(false);

  const startedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const label = useMemo(() => {
    const m = boot.message?.trim();
    if (m) return m;

    if (shown < 20) return "Warming up…";
    if (shown < 60) return "Syncing epoch state…";
    if (shown < 90) return "Loading live game feed…";
    return "Finalizing…";
  }, [boot.message, shown]);

  // Smoothly animate progress toward target
  useEffect(() => {
    // don’t keep animating once fade started
    if (fadeOut) return;

    let raf: number;

    const tick = () => {
      setShown((p) => {
        const rawTarget = boot.status === "ready" ? 100 : Math.min(95, boot.progress);
        const target = boot.status === "ready" ? 100 : Math.max(8, rawTarget); // always at least 8%
        if (p >= target) return p;

        const remaining = target - p;

        // Key: when READY, finish faster so user sees it hit 100 promptly
        const step =
          boot.status === "ready"
            ? Math.max(0.9, remaining * 0.25) // fast finish (still visible)
            : Math.max(0.18, remaining * 0.1); // smooth while loading

        return Math.min(target, p + step);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    rafRef.current = raf;

    return () => {
      cancelAnimationFrame(raf);
      rafRef.current = null;
    };
  }, [boot.progress, boot.status, fadeOut]);

  // When ready AND we reached 100, fade out (but guarantee 100% is painted first)
  useEffect(() => {
    if (startedRef.current) return;
    if (boot.status !== "ready") return;
    if (shown < 100) return;

    startedRef.current = true;

    // Ensure 100% frame is actually painted before fading
    requestAnimationFrame(() => {
      setFadeOut(true);
    });
  }, [boot.status, shown]);

  // Hide only when the fade transition ends
  const onTransitionEnd = () => {
    if (fadeOut) setHidden(true);
  };

  if (hidden) return null;

  return (
    <div
      className={`${styles.wrap} ${fadeOut ? styles.fadeOut : ""}`}
      role="status"
      aria-live="polite"
      onTransitionEnd={onTransitionEnd}
    >
      <div className={styles.card}>
        <div className={styles.logo}>
          <Image
            src="/SVG/ball-2.svg"
            alt="I See Fortune"
            aria-hidden="true"
            width={120}
            height={120}
            priority
            className={styles.image}
          />
        </div>

        <div className={`${styles.subtitle} ${boot.status === "ready" ? styles.ready : ""}`}>
          {label}
        </div>

        <div className={styles.bar} aria-label="Loading progress">
          <div className={styles.fill} style={{ width: `${Math.round(shown)}%` }} />
        </div>

        <div className={styles.meta}>
          <span>{Math.round(shown)}%</span>
          <span className={styles.dot} aria-hidden="true" />
          <span>Loading</span>
        </div>
      </div>
    </div>
  );
}