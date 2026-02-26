"use client";

import Image from "next/image";
import styles from "./Hands.module.scss";

export default function Hands() {
  return (
    <div className={styles.hands}>
      <div className={`${styles.handBox} ${styles.leftHand}`}>
        <Image
          src="/images/template/sidebar/left-hand.svg"
          alt=""
          aria-hidden="true"
          fill
          priority
          className={styles.handImg}
        />
      </div>

      <div className={`${styles.handBox} ${styles.rightHand}`}>
        <Image
          src="/images/template/sidebar/right-hand.svg"
          alt=""
          aria-hidden="true"
          fill
          priority
          className={styles.handImg}
        />
      </div>
    </div>
  );
}