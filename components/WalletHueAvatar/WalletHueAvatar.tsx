"use client";

import * as React from "react";
import styles from "./WalletHueAvatar.module.scss";
import { hueFromPubkey } from "@/utils/pubkeyHue";

type Props = {
  pubkey: string;
  size?: number;        // px
  sat?: number;         // 0..100
  light?: number;       // 0..100
  ring?: boolean;
};

export default function WalletHueAvatar({
  pubkey,
  size = 22,
  sat = 70,
  light = 45,
  ring = true,
}: Props) {
  const hue = React.useMemo(() => hueFromPubkey(pubkey), [pubkey]);
  const initials = pubkey.slice(0, 2).toUpperCase();
  // CSS vars so you can theme easily
  const style: React.CSSProperties & {
    "--hue": number;
    "--sat": string;
    "--light": string;
  } = {
    width: size,
    height: size,
    "--hue": hue,
    "--sat": `${sat}%`,
    "--light": `${light}%`,
  };

  return (
    <span
      className={`${styles.avatar} ${ring ? styles.ring : ""}`}
      style={style}
      aria-hidden
    >
      <span className={styles.text}>{initials}</span>
    </span>
  );
}