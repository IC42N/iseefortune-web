"use client";

import React, { useMemo, useState } from "react";
import { useAtomValue } from "jotai";

import { useResolvedGameCached } from "@/solana/hooks/useResolvedGameCached";
import { useResolvedGameExtrasCached } from "@/solana/hooks/useResolvedGameExtrasCached";

import { selectedEpochAtom } from "@/state/selected-epoch-history-atoms";
import { selectedTierAtom } from "@/state/tier-atoms";

import { toResolvedGameUIDisplay } from "@/solana/format/resolved-game-displays";
import type { ResolvedGameUIDisplay } from "@/state/resolved-game-types";

import { formatLamportsToSolNumber, shortPk } from "@/utils/solana_helper";
import { bpsToPercentText } from "@/utils/number_helper";
import { numberToCSSVars } from "@/utils/colors";

import styles from "./PastGameResults.module.scss";
import { shortenBlockHash } from '@/utils/resolved-game-helper';
import Link from 'next/link';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <button type="button" className={styles.copyBtn} onClick={onCopy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function PastGameResults() {
  const selected = useAtomValue(selectedEpochAtom);
  const tier = useAtomValue(selectedTierAtom);

  const epoch = selected.kind === "epoch" ? BigInt(selected.epoch) : null;
  const enabled = selected.kind === "epoch" && epoch !== null && tier !== null;

  // Fetch resolved game data either from cache or RPC.
  const { data, loading, error } = useResolvedGameCached({
    epoch,
    tier,
    cluster: "mainnet",
    enabled,
  });

  // Convert ResolvedGameUI to ResolvedGameUIDisplay for display purposes
  const game: ResolvedGameUIDisplay | null = useMemo(() => {
    if (!data) return null;
    return toResolvedGameUIDisplay(data);
  }, [data]);

  // Whether extras are enabled to fetch winners and tickets.
  const extrasEnabled =
    enabled && Boolean(data) && data?.status_code === 2 && !game?.is_rollover;

  const extras = useResolvedGameExtrasCached({
    epoch,
    tier,
    enabled: extrasEnabled,
  });

  const totalTickets = extras?.tickets?.total_ticket_recipients ?? 0;

  if (!enabled) return null;

  if (loading && !data) {
    return (
      <div className={styles.gameBox} aria-busy="true">
        <div className={styles.header}>
          <div className={styles.titleSkeleton} />
          <div className={styles.badgeSkeleton} />
        </div>
        <div className={styles.heroSkeleton} />
        <div className={styles.grid}>
          {Array.from({ length:2 }).map((_, i) => (
            <div key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.gameBox}>
        <div className={styles.errorRow}>
          <div className={styles.errorTitle}>Game not found</div>
          <div className={styles.errorMsg}>{error}</div>
        </div>
      </div>
    );
  }

  if (!data || !game) {
    return (
      <div className={styles.gameBox}>
        <div className={styles.emptyRow}>
          No results found for epoch <b>{epoch?.toString()}</b>
        </div>
      </div>
    );
  }

  return (
    <section
      className={styles.gameBox}
      style={numberToCSSVars(Number(game.winning_number), 0.95)}
    >
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.kicker}>Resolved game</div>
          <div className={styles.h1}>
            <span className={styles.mono}>{game.game_epoch}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.tier}>Tier {data.tier}</span>
          </div>
        </div>

        <div className={styles.headerRt}>
          <a
            href={`https://verify.iseefortune.com/?epoch=${game.epoch}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.arweaveBtn}
            title="Don't trust anyone. Verify the results yourself."
          >
            Results Verification
          </a>
        </div>
      </div>

      {/* HERO */}
      <div className={styles.hero}>
        <div
          className={styles.winBubble}
          aria-label="Winning number"
          style={numberToCSSVars(Number(game.winning_number), 0.95)}
        >
          <div className={styles.winLabel}>Winning number</div>
          <div className={styles.winValue}>{game.winning_number}</div>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.heroLine}>
            <span className={styles.heroKey}>Net prize pool</span>
            <span className={styles.heroVal}>
              <span className={styles.big}>{game.net_prize_sol}</span>
              <span className={styles.unit}> SOL</span>
            </span>
          </div>


            <div className={styles.heroLine}>
              <span className={styles.heroKey}>Total Predictions</span>
              <span className={styles.heroVal}>
                <span className={styles.big}>{game.total_bets}</span>
              </span>
            </div>

        </div>
      </div>

      {/* GRID STATS */}
      <div className={`${styles.grid} ${styles.four}`}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total winners</div>
          <div className={styles.cardValue}>{game.total_winners}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Missed</div>
          <div className={styles.cardValue}>{game.total_missed}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Tickets</div>
          <div className={styles.cardValue}>{totalTickets}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Claimed</div>
          <div className={styles.cardValue}>{game.claimed_winners}</div>
        </div>
      </div>

      {/* VERIFY MINI GRID */}
      <div className={`${styles.grid} ${styles.third}`}>
        <div className={styles.card}>
          <div className={styles.label}>Blockhash used</div>
          <div className={styles.valueRow}>
            <div className={styles.valueMono}>{shortenBlockHash(game.blockhash_used)}</div>
            <div className={styles.actions}>
              <CopyButton value={game.blockhash_used} />

            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.label}>Slot used</div>
          <div className={styles.valueRow}>
            <div className={styles.valueMono}>{game.slot_used}</div>
            <a
              href={`https://explorer.solana.com/block/${game.slot_used}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.verifyBtn}
            >Verify</a>
          </div>
        </div>
      </div>

      {/* WINNERS + TICKETS */}
      <div className={styles.extrasWrap}>
        {game.is_rollover ? (
          <div className={styles.rollover} style={numberToCSSVars(Number(game.winning_number), 0.95)}>
            This game rolled over to next epoch
          </div>
        ) : extras.loading && !extras.data ? (
          <div className={styles.extrasLoading}>Loading winners and tickets…</div>
        ) : extras.error ? (
          <div className={styles.extrasError}>Game data not found</div>
        ) : (
          <>
            <div className={styles.extrasHeader}>
              <div className={styles.extrasTitle} style={numberToCSSVars(Number(game.winning_number), 0.95)}>
                Winners and ticket awards
              </div>
            </div>

            {/* Winners */}
            <div className={styles.winnersTickets}>
              <div className={`${styles.tableCard} ${styles.tableCardWinners}`}>
                <div className={styles.tableTitle}>
                  Winners{" "}
                  <span className={styles.tableSub}>
                  ({extras.winners?.length ?? 0})
                </span>
                </div>

                {!extras.winners || extras.winners.length === 0 ? (
                  <div className={styles.tableEmpty}>No winners found</div>
                ) : (
                  <div className={styles.table}>
                    <div className={styles.thead}>
                      <div>Player</div>
                      <div className={styles.right}>Wager</div>
                      <div className={styles.right}>Payout</div>
                    </div>

                    {extras.winners.map((w) => (
                      <div key={w.player} className={styles.tr}>
                        <div className={styles.pkCell}>
                            <Link
                              href={`/profile/${shortPk(w.player)}`}
                              className={styles.mono}
                              title={shortPk(w.player)}
                              style={numberToCSSVars(Number(game.winning_number), 0.95)}
                            >
                              {shortPk(w.player)}
                            </Link>
                        </div>
                        <div className={styles.rightMono}>
                          {formatLamportsToSolNumber(w.wager_lamports)}
                        </div>
                        <div className={styles.rightMono}>
                          {formatLamportsToSolNumber(w.payout_lamports)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Tickets */}
              <div className={`${styles.tableCard} ${styles.tableCardTickets}`}>
                <div className={styles.tableTitle}>
                  Tickets{" "}
                  <span className={styles.tableSub}>
                  {extras.tickets
                    ? `(${extras.tickets.total_ticket_recipients} recipients) ${bpsToPercentText(
                      extras.tickets.ticket_reward_bps
                    )}`
                    : "(not available)"}
                </span>
                </div>

                {!extras.tickets ? (
                  <div className={styles.tableEmpty}>No tickets awarded</div>
                ) : extras.tickets.ticket_awards.length === 0 ? (
                  <div className={styles.tableEmpty}>No ticket awards in file.</div>
                ) : (
                  <div className={styles.table}>
                    <div className={styles.thead}>
                      <div>Player</div>
                      <div className={styles.right}>Tickets</div>
                    </div>

                    {extras.tickets.ticket_awards.map((t) => (
                      <div key={t.player} className={styles.tr}>
                        <div className={styles.pkCell}>
                          <Link
                            href={`/profile/${shortPk(t.player)}`}
                            className={styles.mono}
                            title={shortPk(t.player)}
                            style={numberToCSSVars(Number(game.winning_number), 0.95)}
                          >
                            {shortPk(t.player)}
                          </Link>
                        </div>
                        <div className={styles.rightMono}>{t.rewarded}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

    </section>
  );
}