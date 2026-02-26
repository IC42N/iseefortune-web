// components/Decor/Clouds.tsx
"use client";

import Image from "next/image";
import styles from "./Clouds.module.scss";

export default function Clouds() {
  return (
    <>
      <div className={styles.clouds}>
        <div className={`${styles.cloudBox} ${styles.topLeft}`}>
          <Image
            src="/images/template/sidebar/cloud/top-left.svg"
            alt=""
            aria-hidden="true"
            fill
            priority
            className={styles.cloudImg}
          />
        </div>

        <div className={`${styles.cloudBox} ${styles.topRight}`}>
          <Image
            src="/images/template/sidebar/cloud/top-right.svg"
            alt=""
            aria-hidden="true"
            fill
            priority
            className={styles.cloudImg}
          />
        </div>

        <div className={`${styles.cloudBox} ${styles.bottomLeft}`}>
          <Image
            src="/images/template/sidebar/cloud/bottom-left.svg"
            alt=""
            aria-hidden="true"
            fill
            priority
            className={styles.cloudImg}
          />
        </div>

        <div className={`${styles.cloudBox} ${styles.bottomRight}`}>
          <Image
            src="/images/template/sidebar/cloud/bottom-right.svg"
            alt=""
            aria-hidden="true"
            fill
            priority
            className={styles.cloudImg}
          />
        </div>
      </div>
    </>
  );
}