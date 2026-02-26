"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  durationMs?: number;
  quantum?: bigint;
};

export function useAnimatedBigInt(target: bigint | null, opts?: Options) {
  const durationMs = opts?.durationMs ?? 650;
  const quantum = opts?.quantum ?? 1n;

  const [value, setValue] = useState<bigint | null>(target);

  const rafRef = useRef<number | null>(null);
  const fromRef = useRef<bigint>(0n);
  const toRef = useRef<bigint>(0n);
  const startRef = useRef<number>(0);

  function quantize(x: bigint) {
    if (quantum <= 1n) return x;
    return (x / quantum) * quantum;
  }

  useEffect(() => {
    if (target === null) {
      setValue(null);
      return;
    }

    // initialize
    if (value === null) {
      setValue(target);
      return;
    }

    const to = quantize(target);
    const from = quantize(value);

    if (to === from) {
      setValue(to);
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    fromRef.current = from;
    toRef.current = to;
    startRef.current = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic

      const fromV = fromRef.current;
      const toV = toRef.current;
      const delta = toV - fromV;

      // integer eased lerp with 10,000 precision
      const k = BigInt(Math.floor(eased * 10_000));
      let next = fromV + (delta * k) / 10_000n;

      next = quantize(next);
      setValue(next);

      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, quantum]);

  return value;
}