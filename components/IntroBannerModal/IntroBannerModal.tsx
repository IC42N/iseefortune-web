"use client";

import { useState } from "react";
import styles from "./IntroBannerModal.module.scss";

const STORAGE_KEY = "ic42n_intro_dismissed_v1";

function shouldShow() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    // If storage is blocked, default to showing once per session render.
    return true;
  }
}

export default function IntroBannerModal() {
  const [open, setOpen] = useState(() => shouldShow());

  const closeAndRemember = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              Beta phase
            </div>
            <div className={styles.title}>Welcome to I SEE FORTUNE</div>
          </div>

          <button className={styles.close} onClick={closeAndRemember} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.text}>
            I SEE FORTUNE is a fully on-chain epoch game on Solana. Outcomes are derived from finalized
            blockchain data - anyone can verify results independently.
          </p>

          <ul className={styles.list}>
            <li className={styles.item}>
              <span className={`${styles.icon} ${styles.ok}`}>✓</span>
              Public, verifiable resolution (no “trust us” randomness)
            </li>
            <li className={styles.item}>
              <span className={`${styles.icon} ${styles.ok}`}>✓</span>
              Every round is reproducible from on-chain data
            </li>
            <li className={styles.item}>
              <span className={`${styles.icon} ${styles.ok}`}>✓</span>
              Placing predictions and game resolution is functional
            </li>
            <li className={styles.item}>
              <span className={`${styles.icon} ${styles.ok}`}>✓</span>
              Claiming winnings is functional
            </li>
            <li className={styles.item}>
              <span className={`${styles.icon} ${styles.warn}`}>!</span>
              BETA: On mainnet. UI bugs possible, features may change
            </li>
          </ul>
        </div>

        <div className={styles.footer}>
          <a className={styles.btn} href="https://verify.iseefortune.com" target="_blank" rel="noreferrer">
            How verification works
          </a>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={closeAndRemember}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}