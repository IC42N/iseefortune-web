import { numberToCSSVars } from "@/utils/colors";
import styles from "./SelectedNumbers.module.scss";

type Size = "sm" | "md" | "lg" | "xl";

export function SelectedNumbers({
  numbers = [],
  opacity = 0.9,
  size = "md",
  align = "center",
}: {
  numbers?: number[];
  opacity?: number;
  size?: Size;
  align?: "start" | "center" | "end";
}) {
  if (numbers.length === 0) return null;

  return (
    <div
      className={styles.successNumbers}
      data-size={size}
      data-align={align}
    >
      {numbers.map((n, i) => (
        <div
          key={`${n}-${i}`}
          className={styles.successIcon}
          aria-hidden
          style={numberToCSSVars(n, opacity)}
        >
          <span className={styles.successIconInner}>{n}</span>
        </div>
      ))}
    </div>
  );
}