"use client";

import { useEffect } from "react";

type Props = {
  epoch?: string;
  bettingClosed?: boolean;
};

export function EpochTitle({ epoch, bettingClosed }: Props) {
  useEffect(() => {
    if (!epoch || epoch == "") return;

    document.title = bettingClosed
      ? `Epoch #${epoch} · 🔒· I See Fortune`
      : `Epoch #${epoch} · Open · I See Fortune`;

    return () => {
      document.title = "I See Fortune";
    };
  }, [epoch, bettingClosed]);

  return null;
}