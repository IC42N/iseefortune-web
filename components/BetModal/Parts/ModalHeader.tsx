"use client";

import styles from "@/components/BetModal/BetModal.module.scss";
import { formatSlots } from '@/utils/betting';

type ModalHeaderProps = {
  title: string;
  bettingClosed: boolean;
  remainingSlots: number | null;
  onCloseAction: () => void;
};

export default function ModalHeader({
  title,
  bettingClosed,
  remainingSlots,
  onCloseAction,
}: ModalHeaderProps) {
  return (
    <div className={styles.modalHeader}>
      <div className={styles.modalHeaderLeft}>
        {/*<div className={styles.iconBox}>*/}
        {/*  <Image*/}
        {/*    src="/SVG/crystal-ball.svg"*/}
        {/*    alt=""*/}
        {/*    width={30}*/}
        {/*    height={18}*/}
        {/*    className={styles.headerIconImg}*/}
        {/*  />*/}
        {/*</div>*/}

        <div className={styles.titleBox}>
          <div className={styles.modalTitle}>{title}</div>

          <div className={styles.modalSub}>
            {bettingClosed ? (
              <span className={styles.closed}>Betting closed</span>
            ) : remainingSlots == null ? (
              <span className={styles.pending}>—</span>
            ) : (
              <>
                <span className={styles.endMsg}>Submissions ends in</span>{" "}
                <span className={styles.count}>{formatSlots(remainingSlots)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        className={styles.iconBtn}
        onClick={onCloseAction}
        aria-label="Close"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}