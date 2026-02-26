"use client";

import { useEffect, useRef } from "react";
import styles from "./XpPill.module.scss";

export default function XpPill(props: { xp?: bigint }) {
  const { xp } = props;

  const ref = useRef<HTMLDivElement | null>(null);
  const hadXpRef = useRef(false);

  useEffect(() => {
    if (!ref.current) return;

    const hasXp = xp != null;

    // Animate only on transition: undefined -> value
    if (!hadXpRef.current && hasXp) {
      ref.current.classList.add(styles.in);
    }

    hadXpRef.current = hasXp;
  }, [xp]);

  if (xp == null) {
    return <div className={styles.skeleton} />;
  }

  return (
    <div ref={ref} className={styles.pill}>
      {xp.toString()} XP
    </div>
  );
}