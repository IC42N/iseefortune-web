import styles from "@/components/BetModal/BetModal.module.scss";
import { HUE_BY_NUMBER, type CSSVars } from "@/utils/colors";

export function NumberChips({ numbers }: { numbers: number[] }) {
  if (!numbers.length) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 4,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {numbers.map((n, i) => {
        const h = HUE_BY_NUMBER[n] ?? 50;
        const st = { "--hue": String(h) } as CSSVars;
        const isLast = i === numbers.length - 1;
        return (
          <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {/* Separator before last number */}
            {numbers.length > 1 && isLast && (
              <span className={styles.andText}> and</span>
            )}

            <b className={styles.summaryNumber} style={st}>
              <span className={styles.numberSign}>#</span>
              {n}
            </b>
          </span>
        );
      })}
    </span>
  );
}