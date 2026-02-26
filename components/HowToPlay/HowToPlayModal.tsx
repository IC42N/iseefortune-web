"use client";

import HowToPlayPage from "./HowToPlayPage";
import styles from '@/components/HowToPlay/HowToPlayModal.module.scss';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React from 'react';


export default function HowToPlayModal() {

  const router = useRouter();
  function close() {
    router.back()
  }

  // Copy the same open/close handling pattern from ProfileModal
  return (
    // your existing modal component wrapper here
    <div className={styles.overlay} onClick={close}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalInner} >

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
          </div>

          <button className={styles.close} onClick={close} type="button" aria-label="Close">×</button>

          <div className={styles.body}>
            <div className={styles.stars}></div>
            <div className={styles.stars2}></div>
            <div className={styles.stars3}></div>
            <HowToPlayPage />
          </div>
        </div>
      </div>
    </div>
  );
}