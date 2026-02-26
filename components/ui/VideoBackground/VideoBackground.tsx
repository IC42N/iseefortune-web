"use client";

import { ReactNode, useState } from "react";
import styles from "./VideoBackground.module.scss";

export default function VideoBackground({
  src,
  children,
}: {
  src: string;
  children?: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  return (
    <div className={styles.wrapper}>
      {/* Placeholder layer (shows while video is loading) */}
      <div className={`${styles.poster} ${ready ? styles.posterHidden : ""}`} />

      <video
        className={`${styles.video} ${ready ? styles.videoReady : styles.videoHidden}`}
        autoPlay
        muted
        loop
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        playsInline
        preload="auto"
        // Fires when enough data is available to start playing
        onCanPlay={() => setReady(true)}
        // Some devices fire this more reliably
        onLoadedData={() => setReady(true)}
      >
        <source src={src} type="video/mp4" />
      </video>

      <div className={styles.content}>{children}</div>
    </div>
  );
}