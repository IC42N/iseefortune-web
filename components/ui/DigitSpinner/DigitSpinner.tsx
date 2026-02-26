"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";

type DigitSpinnerProps = {
  spinning: boolean;        // true = keep randomizing, false = slow down + lock to finalNumber
  finalNumber: number;      // 0-9
  speedMs?: number;         // base speed while spinning (default 70ms)
  pulse?: boolean;          // pulse opacity while spinning (default true)
  className?: string;

  // optional: re-run the reveal animation even if finalNumber is same
  revealKey?: string | number;

  // fake slow-down controls
  slowDownMs?: number;      // total slow down duration (default 650ms)
  slowDownSteps?: number;   // how many decel "ticks" (default 10)
};

function clampDigit(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(9, Math.floor(n)));
}

function randomDigit() {
  return Math.floor(Math.random() * 10);
}

function nextRandomNot(prev: number) {
  let d = randomDigit();
  if (d === prev) d = (d + 1) % 10;
  return d;
}

export function DigitSpinner({
                               spinning,
                               finalNumber,
                               speedMs = 70,
                               pulse = true,
                               className,
                               revealKey,
                               slowDownMs = 650,
                               slowDownSteps = 10,
                             }: DigitSpinnerProps) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const final = clampDigit(finalNumber);

  // MotionValue holds the digit
  const mv = useMotionValue<number>(0);

  // Convert motion value to text, rendered directly by motion (no React state)
  const text = useTransform(mv, (v) => String(clampDigit(v)));

  // Keep track of the running animation so we can stop it
  const controlsRef = React.useRef<ReturnType<typeof animate> | null>(null);

  const stopAnim = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const startFastSpin = React.useCallback(() => {
    stopAnim();

    const minDelay = Math.max(25, speedMs);
    const durationPerTick = minDelay / 1000;

    // A "manual loop": animate from current to next digit repeatedly.
    const loop = () => {
      const prev = clampDigit(mv.get());
      const next = nextRandomNot(prev);

      controlsRef.current = animate(mv, next, {
        duration: durationPerTick,
        ease: "linear",
        onComplete: () => {
          // If we stopped spinning during this tick, bail.
          // (spinning checked via outer effect; this is just best-effort)
          loop();
        },
      });
    };

    loop();
  }, [mv, speedMs, stopAnim]);

  const runSlowDownThenLock = React.useCallback(() => {
    stopAnim();

    const steps = Math.max(3, slowDownSteps);
    const totalMs = Math.max(250, slowDownMs);

    // Build keyframes: random digits then final
    const keyframes: number[] = [];
    let last = clampDigit(mv.get());

    for (let i = 0; i < steps; i++) {
      const d = nextRandomNot(last);
      keyframes.push(d);
      last = d;
    }
    keyframes.push(final);

    // times[] controls spacing between keyframes (0..1),
    // we ease-out by making later steps "farther apart"
    const times: number[] = [];
    for (let i = 0; i < keyframes.length; i++) {
      const t = i / (keyframes.length - 1); // 0..1
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      times.push(eased);
    }

    controlsRef.current = animate(mv, keyframes, {
      duration: totalMs / 1000,
      ease: "linear", // times already encode easing
      times,
    });
  }, [final, mv, slowDownMs, slowDownSteps, stopAnim]);

  React.useEffect(() => {
    if (prefersReduced) {
      stopAnim();
      mv.set(final);
      return;
    }

    if (spinning) {
      startFastSpin();
      return () => stopAnim();
    }

    // spinning -> false: slow down then lock
    runSlowDownThenLock();
    return () => stopAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, final, prefersReduced, revealKey]);

  // Wrapper vibe while spinning
  const spinAnim = spinning
    ? {
      opacity: pulse ? [0.55, 1, 0.65] : 1,
      scale: [1, 1.02, 1],
      filter: ["blur(0px)", "blur(0.4px)", "blur(0px)"],
    }
    : { opacity: 1, scale: 1, filter: "blur(0px)" };

  // When it stops, do a "winner bounce"
  const revealAnim = spinning
    ? {}
    : {
      y: [0, -6, 0],
      scale: [1, 1.14, 1],
    };

  return (
    <motion.span
      className={className}
      style={{ display: "inline-block", willChange: "transform, opacity, filter" }}
      animate={spinAnim}
      transition={
        spinning
          ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
      }
    >
      <motion.span
        style={{
          display: "inline-block",
          textShadow: spinning
            ? "0 0 10px rgba(255,255,255,0.25)"
            : "0 0 14px rgba(255,255,255,0.38)",
        }}
        animate={revealAnim}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        key={spinning ? "spinning" : `revealed-${final}-${revealKey ?? ""}`}
      >
        {text}
      </motion.span>
    </motion.span>
  );
}