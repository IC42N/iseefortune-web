"use client";

import { useEffect, useState } from "react";

export function useIsMobile(maxWidthPx = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);

    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [maxWidthPx]);

  return isMobile;
}