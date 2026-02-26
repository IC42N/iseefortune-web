"use client";

import Image from "next/image";
import { useAtomValue } from "jotai";
import { epochClockAtom } from "@/state/epoch-clock-atoms";
import { appReadyAtom } from "@/state/global-atoms";

import { formatHMS } from "@/utils/countdown";
import { ProgressRing } from "@/components/ui/ProgressRing/ProgressRing";
import styles from "./EpochBox.module.scss";
import SpaceWarpCanvas from "@/components/ui/SpaceWarp/SpaceWarpCanvas";

export default function EpochSubHeader() {
  const appReady = useAtomValue(appReadyAtom);
  const clock = useAtomValue(epochClockAtom);

  if (!appReady || !clock) {
    return (
      <div className={styles.root}>
        <div className={styles.col}>
          <div className={styles.label}>Slots remaining</div>
          <div className={styles.timerWrap}>
            <div className={styles.timerSkeleton} />
          </div>
          <div className={styles.time}>Estimating time…</div>
        </div>
      </div>
    );
  }

  const markerLabel = clock.phase === "locked" ? "LOCKED" : `${(clock.progress * 100).toFixed(0)}%`;
  const stopPulse = clock?.phase === "locked" || clock?.phase === "resolving";

  return (
    <div className={styles.root}>
      <div className={styles.warpBg} aria-hidden>
        <SpaceWarpCanvas />
      </div>

      <div className={styles.clouds}>
        {/* ... your clouds unchanged ... */}
        <div className={`${styles.cloudBox} ${styles.topLeft}`}>
          <Image src="/images/template/sidebar/cloud/top-left.svg" alt="" aria-hidden fill priority className={styles.cloudImg} />
        </div>
        <div className={`${styles.cloudBox} ${styles.topRight}`}>
          <Image src="/images/template/sidebar/cloud/top-right.svg" alt="" aria-hidden fill priority className={styles.cloudImg} />
        </div>
        <div className={`${styles.cloudBox} ${styles.bottomLeft}`}>
          <Image src="/images/template/sidebar/cloud/bottom-left.svg" alt="" aria-hidden fill priority className={styles.cloudImg} />
        </div>
        <div className={`${styles.cloudBox} ${styles.bottomRight}`}>
          <Image src="/images/template/sidebar/cloud/bottom-right.svg" alt="" aria-hidden fill priority className={styles.cloudImg} />
        </div>
      </div>

      <div className={styles.col}>
        <div className={styles.timerWrap}>
          <div style={{ position: "relative", width: 300, height: 300 }}>
            <ProgressRing
              size={300}
              strokeWidth={20}
              progress={clock.progress}
              trailColor="#2A2F3A"
              strokeColor={clock.color}
              linecap="butt"
              showMarker={!stopPulse}
              markerLength={20}
              markerWidth={2}
              markerColor={clock.color}
              markerLabel={markerLabel}
              markerLabelColor={clock.color}
              markerLabelFontSize={14}
              markerLabelOffset={13}
              pulseEnabled={!stopPulse}
            >
              <div className={styles.graphCenter}>
                <div className={styles.label}>Slots remaining</div>
                <div className={styles.slots}>{clock.remainingSlots.toLocaleString()}</div>
                <div className={styles.time}>
                  {clock.remainingSec == null ? "Estimating time…" : `~${formatHMS(clock.remainingSec)} left`}
                </div>
              </div>
            </ProgressRing>
          </div>
        </div>
      </div>
    </div>
  );
}