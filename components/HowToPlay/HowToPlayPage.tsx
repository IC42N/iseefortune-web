"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./HowToPlay.module.scss";

type TabId = "how-to-play" | "game-rules" | "verifiable-fair";

const TABS: { id: TabId; label: string }[] = [
  { id: "how-to-play", label: "How to Play" },
  { id: "game-rules", label: "Game Mechanics" },
  { id: "verifiable-fair", label: "Verifiable & Fair" },
];

function normalizeHashToTabId(hash: string): TabId | null {
  const raw = hash.replace("#", "").trim().toLowerCase();
  if (!raw) return null;

  // allow a couple friendly aliases if you ever link them
  const aliases: Record<string, TabId> = {
    "howtoplay": "how-to-play",
    "how-to-play": "how-to-play",
    "rules": "game-rules",
    "game-rules": "game-rules",
    "verifiable": "verifiable-fair",
    "verifiable-fair": "verifiable-fair",
    "verifiable-and-fair": "verifiable-fair",
  };

  return aliases[raw] ?? null;
}

export default function HowToPlayPage() {
  const [activeTab, setActiveTab] = useState<TabId>("how-to-play");

  // Sync tab state from URL hash (supports direct linking + dropdown links)
  useEffect(() => {
    const applyFromHash = () => {
      const tab = normalizeHashToTabId(window.location.hash);
      if (tab) setActiveTab(tab);
    };

    applyFromHash();
    window.addEventListener("hashchange", applyFromHash);
    return () => window.removeEventListener("hashchange", applyFromHash);
  }, []);

  const activeIndex = useMemo(
    () => Math.max(0, TABS.findIndex((t) => t.id === activeTab)),
    [activeTab]
  );

  const onSelectTab = (id: TabId) => {
    setActiveTab(id);
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* 1) Header message / simple paragraph */}
        <header className={styles.header}>
          <h1 className={styles.title}>The Game</h1>
          <p className={styles.subtitle}>
            At the end of each Solana epoch, a winning number (0~9) is computed from the final blockhash.
            Use your intuition, pick a number, and set your conviction amount. True randomness will decide your fate.
            If your number is chosen, the pot is split among winners proportional to the amount you contribute.
          </p>
        </header>

        {/* 2) Tabs that can be linked to and fade between sections */}
        <nav className={styles.tabs} aria-label="About game sections">
          <div role="tablist" aria-orientation="horizontal" className={styles.tabList}>
            {TABS.map((t, i) => {
              const isActive = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${t.id}`}
                  id={`tab-${t.id}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
                  onClick={() => onSelectTab(t.id)}
                >
                  <span className={styles.tabLabel}>{t.label}</span>
                </button>
              );
            })}
          </div>

        </nav>

        {/* Fade panel: key forces remount so the animation re-triggers on change */}
        <section
          key={activeTab}
          className={styles.tabPanel}
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          data-active-index={activeIndex}
        >
          {activeTab === "how-to-play" && <HowToPlaySection />}
          {activeTab === "game-rules" && <GameRulesSection />}
          {activeTab === "verifiable-fair" && <VerifiableFairSection />}
        </section>

        <div className={styles.slogan}>
          A game for those that trust absolutely no one
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerContent}>

            <span className={styles.copyright}>
              © {new Date().getFullYear()} &middot; I SEE FORTUNE
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function HowToPlaySection() {
  return (
    <div className={styles.section}>

      <ol className={styles.steps}>
        <li className={styles.step}>
          <div className={styles.stepTop}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepTitle}>Connect your wallet</div>
          </div>
          <p className={styles.stepBody}>Connect to place a prediction and receive payouts.</p>
        </li>

        <li className={styles.step}>
          <div className={styles.stepTop}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepTitle}>Predict the next number</div>
          </div>
          <p className={styles.stepBody}>
            Use your intuition and determine what number will come next. Place your prediction before the epoch ends.
          </p>
        </li>

        <li className={styles.step}>
          <div className={styles.stepTop}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepTitle}>Wait for the epoch to resolve</div>
          </div>
          <p className={styles.stepBody}>
            When the epoch ends, the winning number is computed and your fate will be decided.
          </p>
        </li>

        <li className={styles.step}>
          <div className={styles.stepTop}>
            <div className={styles.stepNum}>4</div>
            <div className={styles.stepTitle}>Collect winnings</div>
          </div>
          <p className={styles.stepBody}>
            If your intuitions was correct, you will receive the portion relative to your conviction. Payouts are claimed in your profile.
          </p>
        </li>
      </ol>

      <div className={styles.callout}>
        <span className={styles.calloutTitle}>Pro tip</span>
        <span className={styles.calloutBody}>
          Fewer players on a number usually means a bigger share if it wins.
        </span>
      </div>
    </div>
  );
}

function GameRulesSection() {
  return (
    <div className={styles.section}>


      <div className={styles.rulesGrid}>

        <div className={styles.ruleCard}>
          <div className={styles.ruleTitle}>Predictions</div>
          <p className={styles.ruleBody}>
            You can place one prediction per tier per wallet.
          </p>
        </div>

        <div className={styles.ruleCard}>
          <div className={styles.ruleTitle}>Chance of winning</div>
          <p className={styles.ruleBody}>
            With a single prediction you always have a 1 in 8 chance of selecting the winning number.
          </p>
        </div>

        <div className={styles.ruleCard}>
          <div className={styles.ruleTitle}>Tiers</div>
          <p className={styles.ruleBody}>
            The game currently runs in <strong>Tier 1</strong>. New tiers will open as the game
            grows, with higher bet ranges for higher stakes.
          </p>
        </div>

        <div className={styles.ruleCard}>
          <div className={styles.ruleTitle}>Taker fee</div>
          <p className={styles.ruleBody}>A default taker fee is applied to each pot. Net pot is the gross pot minus the taker fee.</p>
        </div>

        <div className={styles.ruleCard}>
          <div className={styles.ruleTitle}>Rollover numbers</div>
          <p className={styles.ruleBody}>
            There are two rollover numbers: <strong>0</strong> and the{" "}
            <strong>last winning number</strong>. If the winning number happens to be a rollover number, the game
            rolls over into the next epoch.

            On this event, nobody wins, nobody loses, all predictions and the entire pot is carried over to the next epoch. Predictions can be changed and conviction can be increased.
            As a bonus on this rare event, the taker fee drops by <strong>1%</strong>.
          </p>
        </div>
      </div>

      <div className={styles.ruleCardWide}>
        <h3 className={styles.h3}>Change Tickets</h3>
        <p className={styles.ruleBody}>
          Change tickets are auto awarded to a percentage of players who miss the winning number as a consolation prize.
          As all selected prediction number are by default final, a change ticket lets you over ride this and change your prediction before the
          cutoff time for maximum exposure. It is very powerful as switching your prediction to a number with less players can greatly increase pot share if it wins.
          Note: This does not increase the chance of winning, it only increases the possible payout if that number wins.
        </p>
      </div>
    </div>
  );
}

function VerifiableFairSection() {
  return (
    <div className={styles.section}>

      <div className={styles.lede2}>
      <p className={styles.prompt}>
        The winning number is derived entirely from public, immutable on-chain data on the Solana blockchain.
        Specifically, it is computed using the finalized blockhash and slot of the epoch—values that <i>anyone can independently view on Solana Explorer</i>.
      </p>
      <br />

      <p>To verify the result, anyone can:</p>
      <ol className={styles.list}>
        <li>View the finalized blockhash and slot on <a
          href="https://explorer.solana.com"
          target="_blank"
          rel="noopener noreferrer"
        >Solana Explorer</a></li>
        <li>Run our open-source calculation script using those values</li>
        <li>Reproduce the winning number exactly</li>
      </ol>

      <p>For full transparency, a complete resolution record is permanently uploaded to Arweave, containing:</p>
      <ul className={styles.list}>
        <li>The blockhash and slot used in the calculation</li>
        <li>The computed winning number</li>
        <li>The full winners list</li>
        <li>Tickets awarded and rollover data</li>
        <li>Merkle proof data required for on-chain claims</li>
      </ul>

      <p>Anyone can independently compare this record against Solana Explorer and reproduce the calculation without trusting us.
        If the data matches, the result is correct. If it doesn’t, it’s provably wrong.
      </p>

      </div>

      <div className={styles.linksRow}>
        <a
          className={styles.linkBtn}
          href="https://github.com/IC42N/iseefortune-verifier/blob/main/SPEC.md"
          target="_blank"
        >
          Read the Spec
        </a>
        <a
          className={styles.linkBtn}
          href="https://verify.iseefortune.com"
          target="_blank"
        >
          Verify a Result
        </a>
        <a
          className={styles.linkBtn}
          href="https://github.com/IC42N"
          target="_blank"
          rel="noreferrer"
        >
          View Source
        </a>
      </div>

    </div>
  );
}