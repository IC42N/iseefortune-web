"use client";
import Link from "next/link";
import styles from "./ActivityPanel.module.scss";
import { useTierActivityFeed } from "@/hooks/useActivityFeed";
import { numberToCSSVars } from "@/utils/colors";
import { formatCreatedAt } from "@/utils/time";
import { useAtomValue } from "jotai";
import { selectedTierSettingsUiAtom } from "@/state/tier-atoms";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";

import { useCanChat } from "@/hooks/useCanChat";
import { sendChatMessage } from '@/utils/chat';
import Image from 'next/image';
import { fetchCornerSVG } from '@/utils/corners';
import { formatLamportsToSol } from '@/utils/solana_helper';

const MAX_CHAT_LEN = 280;

type AnyMsg = {
  id: string;
  type: "system" | "bet" | "chat";
  ts: number;
  text?: string;
  player?: string;
  handle?: string;
  lamportsPerNumber?: string;
  chosenNumbers?: number[];
  subtype?: string;
  winningNumber?: number;
  secondaryRolloverNumber?: number;
};

function renderBetActivity(m: AnyMsg) {
  const playerPk = m.player?.trim() || "";
  const handle = m.handle?.trim() || "";
  const displayHandle = handle.length ? handle : playerPk;

  const chosenNumbers: number[] = Array.isArray(m.chosenNumbers) ? m.chosenNumbers : [];
  const subtype = m.subtype;
  const time = formatCreatedAt(m.ts);

  // NEW: render from lamportsPerNumber (u64 string) instead of m.sol
  const lamportsPerNumberStr = (m.lamportsPerNumber ?? "").toString();
  const lamportsPerNumber = lamportsPerNumberStr ? BigInt(lamportsPerNumberStr) : null;

  // If you already have a formatter that takes lamports -> "0.07"
  // replace this with your existing helper.
  const solText = lamportsPerNumber !== null ? formatLamportsToSol(lamportsPerNumber) : null;

  // Fallback if required fields missing
  if (!playerPk || !chosenNumbers.length || !solText) {
    return (
      <div className={styles.betActivity}>
        <div className={styles.time}>{time}</div>
        <div className={styles.textBx}>
          <span className={styles.text}>{m.text ?? "Prediction activity"}</span>
        </div>
      </div>
    );
  }

  // Pick a primary number just for container tinting
  const primary = chosenNumbers[0];

  const User = (
    <span className={styles.user} title={playerPk}>
      <Link
        href={`/profile/${displayHandle}`}
        className={styles.chatUser}
        title={handle}
      >
        {displayHandle}
      </Link>
    </span>
  );

  // Render all chosen numbers as individually colored tokens
  const Numbers = (
    <span className={styles.chosenNumbers}>
      {chosenNumbers.map((n) => (
        <span
          key={n}
          className={styles.chosenNumber}
          style={numberToCSSVars(n, 0.95)}
        >{n}</span>
      ))}
    </span>
  );

  // Amount styling: use primary number hue (or make it neutral if you prefer)
  const Amt = (
    <span className={styles.amount} style={numberToCSSVars(primary, 0.6)}>
      {solText} SOL
    </span>
  );

  return (
    <div className={styles.betActivity} style={numberToCSSVars(primary, 0.5)}>
      <div className={styles.time}>{time}</div>

      <div className={styles.textBx}>
        {subtype === "prediction_increase" ? (
          <>
            {User}
            <span className={styles.text}> increased prediction for </span>
            {Numbers}
            <span className={styles.text}> by </span>
            {Amt}
          </>
        ) : subtype === "change_prediction_numbers" ? (
          <>
            {User}
            <span className={styles.text}> changed prediction to </span>
            {Numbers}
            <span className={styles.text}>.</span>
          </>
        ) : (
          <>
            {User}
            <span className={styles.text}> predicts </span>
            {Numbers}
            <span className={styles.text}> with </span>
            {Amt}
          </>
        )}
      </div>
    </div>
  );
}


function renderChatActivity(m: AnyMsg) {
  const handle = m.handle?.trim() || m.player?.trim() || "";
  const text = m.text?.trim() || "";
  const time = formatCreatedAt(m.ts);

  if (!handle || !text) return null;

  return (
    <div className={styles.chatRow}>
      <div className={styles.chatMeta}>
        <Link
          href={`/profile/${handle}`}
          className={styles.chatUser}
          title={handle}
        >
          {handle}
        </Link>
        <span className={styles.chatTime}>{time}</span>
      </div>

      <div className={styles.chatBubble}>
        <span className={styles.chatText}>{text}</span>
      </div>
    </div>
  );
}


export default function ActivityPanel() {
  const { messages, loading, error } = useTierActivityFeed();

  //console.log(messages);

  //const liveFeed = useAtomValue(liveFeedUIAtom);
  const tierUi = useAtomValue(selectedTierSettingsUiAtom);

  const tierId = tierUi?.tierId ?? null;

  // Chat permission
  const { loading: chatLoading, authed, canChat } = useCanChat(tierId ?? 1);

  const items: AnyMsg[] = useMemo(() => {
    if (loading) return [{ id: "loading", type: "system", text: "Loading activity…", ts: 0 }];
    if (error) return [{ id: "error", type: "system", text: "Activity unavailable", ts: 0 }];
    return messages as unknown as AnyMsg[];
  }, [messages, loading, error]);

  // -----------------------------
  // Auto-scroll behavior
  // -----------------------------
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewWhileUp, setHasNewWhileUp] = useState(false);

  const snapToBottom = () => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  };

  const smoothToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceFromBottom < 140;

    setIsNearBottom(near);
    if (near) setHasNewWhileUp(false);
  };

  useLayoutEffect(() => {
    snapToBottom();
  }, []);

  useEffect(() => {
    if (isNearBottom) smoothToBottom();
    else setHasNewWhileUp(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // -----------------------------
  // Chat composer
  // -----------------------------
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const canShowInput = tierId != null && canChat && !chatLoading;

  const onSend = useCallback(async () => {
    if (!canShowInput) return;
    if (tierId == null) return;

    const text = draft.trim().slice(0, MAX_CHAT_LEN);
    if (!text.length) return;

    setSending(true);
    try {
      await sendChatMessage(tierId, text);
      setDraft("");
      // Keep the view pinned as you chat
      smoothToBottom();
    } finally {
      setSending(false);
    }
  }, [canShowInput, tierId, draft]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.gameTitle}>ACTIVITY FEED</div>
        <div className={styles.liveBadge}>
          <span className={styles.dot} />
          <span className={styles.label}>Live</span>
        </div>
      </div>

      <div className={styles.messages} ref={listRef} onScroll={handleScroll}>
        {items.map((m) => {

          //System messages
          if (m.type === "system") {

            // New game message
            if(m.subtype == "new_game_started") {
              return (
                <React.Fragment key={m.id}>
                  <div className={styles.newGameMessage}>
                    <div className={styles.newGameInner}>
                      {m.text}
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            // Resolved messages
            const cornerSVG = "/corners/" + fetchCornerSVG(m.winningNumber);

            return (
              <React.Fragment key={m.id}>
                {/*<div className={styles.divider}>*/}
                {/*  <Image src={"/dividers/d1.svg"} alt="divider" aria-hidden fill priority className={styles.dividerImg} />*/}
                {/*</div>*/}

                <div className={styles.divider} />

                <div key={m.id} className={styles.resolvedMessage}>

                  <div className={styles.borders}>
                    <div className={`${styles.borderBox} ${styles.topLeft}`}>
                      <Image src={cornerSVG} alt="" aria-hidden fill priority className={styles.cornerImg} />
                    </div>
                    <div className={`${styles.borderBox} ${styles.topRight}`}>
                      <Image src={cornerSVG} alt="" aria-hidden fill priority className={styles.cornerImg} />
                    </div>
                    <div className={`${styles.borderBox} ${styles.bottomLeft}`}>
                      <Image src={cornerSVG} alt="" aria-hidden fill priority className={styles.cornerImg} />
                    </div>
                    <div className={`${styles.borderBox} ${styles.bottomRight}`}>
                      <Image src={cornerSVG} alt="" aria-hidden fill priority className={styles.cornerImg} />
                    </div>
                  </div>

                  <div className={styles.resolvedInner}>
                    {m.text}
                  </div>
                </div>
                {/*<div className={styles.divider}>*/}
                {/*  <Image src={"/divider/d1.svg"} alt="divider" aria-hidden fill priority className={styles.dividerImg} />*/}
                {/*</div>*/}

                <div className={styles.divider} />
              </React.Fragment>
            );
          }

          if (m.type === "chat") {
            return (
              <div key={m.id} className={`${styles.chatMessage}`}>
                {renderChatActivity(m)}
              </div>
            );
          }

          return (
            <div key={m.id} className={`${styles.message} ${styles.betMessage}`}>
              {renderBetActivity(m)}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {hasNewWhileUp && (
        <button
          type="button"
          className={styles.newMessagesPill}
          onClick={() => {
            setHasNewWhileUp(false);
            smoothToBottom();
          }}
        >
          New messages ↓
        </button>
      )}

      {/* Input gating (polished) */}
      <div className={styles.inputBar}>
        {/* Optional helpers line (feels professional) */}
        <div className={styles.inputHint}>
          {chatLoading ? "Checking chat access…" : ""}
        </div>

        <div className={styles.chatInputWrap}>
          <input
            className={styles.chatInput}
            type="text"
            placeholder={
              chatLoading
                ? "Checking chat access…"
                : canShowInput
                  ? "Type a message…"
                  : authed
                    ? "Place your prediction to join chat"
                    : "Connect wallet to chat"
            }
            value={draft} // ✅ ALWAYS controlled
            onChange={(e) => {
              if (!canShowInput) return;
              const next = e.target.value.slice(0, MAX_CHAT_LEN);
              setDraft(next);
            }}
            onKeyDown={(e) => {
              if (!canShowInput) return;
              if (e.key === "Enter") void onSend();
            }}
            disabled={!canShowInput || sending || chatLoading}
          />
          <div className={styles.charCount}>
            {draft.length}/{MAX_CHAT_LEN}
          </div>

          <button
            className={styles.sendBtn}
            type="button"
            onClick={() => void onSend()}
            disabled={!canShowInput || sending || chatLoading || !draft.trim()}
            aria-disabled={!canShowInput || sending || chatLoading || !draft.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}