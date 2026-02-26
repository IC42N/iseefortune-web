"use client";

import { useMemo, useState } from "react";
import styles from "./FullScreenError.module.scss";

type Props = {
  title?: string;
  message?: string;
  details?: string;
  status?: "offline" | "rpc" | "unknown";
};

export default function FullscreenError({
  title,
  message,
  details,
  status = "rpc",
}: Props) {
  const [copied, setCopied] = useState(false);

  const header = useMemo(() => {
    if (title) return title;
    if (status === "offline") return "You’re Offline";
    if (status === "rpc") return "Can’t Reach the Network";
    return "Something Went Sideways";
  }, [title, status]);

  const body = useMemo(() => {
    if (message) return message;

    if (status === "offline") {
      return "Your connection looks down. Reconnect and we’ll bring the app back instantly.";
    }

    return "We couldn’t fetch the latest game data. This usually happens from poor internet or an RPC hiccup.";
  }, [message, status]);

  async function copyDebug() {
    const text = [
      `title: ${header}`,
      `status: ${status}`,
      details ? `details: ${details}` : "",
      `time: ${new Date().toISOString()}`,
      `ua: ${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }


  function onRetry() {
    // Option A: soft retry
    window.location.reload();

    // Option B (later): trigger your bootstrap atom
    // setBootStatus({ status: "loading" })
  }

  return (
    <div className={styles.root}>
      <div className={styles.bg} />
      <div className={styles.glow} />

      <div className={styles.card}>
        <div className={styles.top}>
          <div className={styles.badge}>
            <span className={styles.dot} />
            {status === "offline" ? "OFFLINE" : "RETRYING"}
          </div>

          <h1 className={styles.title}>{header}</h1>
          <p className={styles.message}>{body}</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => onRetry?.()}>
            Retry
          </button>

          <button className={styles.secondary} onClick={() => window.location.reload()}>
            Reload
          </button>

          <button className={styles.ghost} onClick={copyDebug}>
            {copied ? "Copied" : "Copy Debug"}
          </button>
        </div>

        {details ? (
          <details className={styles.details}>
            <summary>Technical details</summary>
            <pre className={styles.pre}>{details}</pre>
          </details>
        ) : null}

        <div className={styles.hint}>
          <span className={styles.hintLabel}>Quick fixes:</span>
          <span className={styles.hintText}>
            toggle Wi-Fi • try mobile hotspot • switch RPC • wait 10s
          </span>
        </div>
      </div>
    </div>
  );
}