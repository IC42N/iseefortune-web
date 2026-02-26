"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ProcessResolveSteps.module.scss";

type Phase = "starting" | "finalizing" | "long_wait";

// Game-y, non-lying lines. These can rotate forever without feeling fake.
const LINES_STARTING = [
  "Locking the epoch…",
  "Reading finalized chain data…",
  "Shuffling the cosmos…",
];

const LINES_FINALIZING = [
  "Finalizing on-chain state…",
  "Confirming at finalized commitment…",
  "Publishing resolution record…",
  "Waiting for the resolved PDA to land…",
];

const LINES_LONG_WAIT = [
  "Still confirming finality…",
  "Chain is busy — staying at finalized…",
  "Almost there. Waiting for confirmation…",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

export function ProcessingSteps() {
  const [lineIndex, setLineIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  const startedAtRef = useRef<number>(0);

  // start time after mount
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  // elapsed timer
  useEffect(() => {
    const id = window.setInterval(() => {
      const start = startedAtRef.current;
      if (!start) return;
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 500);

    return () => window.clearInterval(id);
  }, []);

  // rotate the status line every ~2.2s (feels “alive” but not frantic)
  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIndex((p) => p + 1);
    }, 2200);

    return () => window.clearInterval(id);
  }, []);

  // choose “phase” based on elapsed time so it never feels like it finished then stalled
  const phase: Phase = useMemo(() => {
    if (elapsedSec < 12) return "starting";
    if (elapsedSec < 45) return "finalizing";
    return "long_wait";
  }, [elapsedSec]);

  const statusLine = useMemo(() => {
    if (phase === "starting") return pick(LINES_STARTING, lineIndex);
    if (phase === "finalizing") return pick(LINES_FINALIZING, lineIndex);
    return pick(LINES_LONG_WAIT, lineIndex);
  }, [phase, lineIndex]);

  const hint = useMemo(() => {
    if (elapsedSec < 20) return "This usually takes a few seconds.";
    if (elapsedSec < 60) return "Waiting for finalized confirmation…";
    return "If this keeps going, it’s usually chain finality or RPC lag — not your device.";
  }, [elapsedSec]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>{statusLine}</div>
      </div>
      <div className={styles.footer}>{hint}</div>
      <div className={styles.elapsed}>Elapsed: {elapsedSec}s</div>
    </div>
  );
}