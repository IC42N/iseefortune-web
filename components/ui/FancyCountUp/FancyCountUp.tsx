"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

type Props = {
  value: number;                 // destination value
  from?: number;                 // start value (default 0)
  duration?: number;             // seconds (default 1.1)
  decimals?: number;             // default 0
  prefix?: string;               // e.g. "$"
  suffix?: string;               // e.g. " SOL"
  compact?: boolean;             // 1.2K style
  className?: string;

  // optional: re-run animation when value changes
  rerunKey?: string | number;
};

function formatNumber(n: number, decimals: number, compact: boolean) {
  const opts: Intl.NumberFormatOptions = compact
    ? { notation: "compact", maximumFractionDigits: decimals }
    : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };

  return new Intl.NumberFormat(undefined, opts).format(n);
}

export function FancyCountUp({
   value,
   from = 0,
   duration = 1.1,
   decimals = 0,
   prefix,
   suffix,
   compact = false,
   className,
   rerunKey,
}: Props) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const mv = useMotionValue(from);

  // Turn the motion value into formatted text
  const rounded = useTransform(mv, (latest) => {
    const p = Math.pow(10, decimals);
    const r = Math.round(latest * p) / p;
    return `${prefix ?? ""}${formatNumber(r, decimals, compact)}${suffix ?? ""}`;
  });

  React.useEffect(() => {
    if (prefersReduced) {
      mv.set(value);
      return;
    }

    // Start from current display value if value updates rapidly
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // "premium" ease-out
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, decimals, prefix, suffix, compact, rerunKey]);

  return (
    <motion.span
      className={className}
      style={{
        // tiny "focus-in" vibe
        filter: "blur(0px)",
      }}
      initial={{ y: 6, opacity: 0, filter: "blur(6px)" }}
      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* This renders as real text (accessible), not a canvas trick */}
      <motion.span>{rounded}</motion.span>

      {/* subtle glint pass */}
      <motion.span
        aria-hidden
        style={{
          display: "inline-block",
          marginLeft: 0,
          position: "relative",
          left: -9999, // keeps it out of layout if you don't want it
        }}
      />
    </motion.span>
  );
}