"use client";
import styles from "./LoadingStars.module.scss";

export default function LoadingStars() {
  return (
    <div className={styles.starfield} aria-hidden="true">
      <div className={styles.stars0} />
      <div className={styles.stars} />
      <div className={styles.stars2} />
      <div className={styles.stars3} />
      <div className={styles.stars4} />
    </div>
  );
}