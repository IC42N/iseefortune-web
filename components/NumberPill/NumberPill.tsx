import type { CSSProperties } from "react";
import { HUE_BY_NUMBER } from "@/utils/colors";
import styles from "./NumberPill.module.scss";

export function NumberPill({ value }: { value: number }) {
  const hue = HUE_BY_NUMBER[value] ?? 50;
  const style = { "--hue": String(hue) } as CSSProperties;

  return (
    <div className={styles.pill} style={style}>
      {value}
    </div>
  );
}