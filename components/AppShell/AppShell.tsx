"use client";

import { useAtomValue } from "jotai";
import { ReactNode } from "react";

import { useBootstrap } from "@/solana/hooks/use-bootstrap";
import { useEpochClockService } from "@/solana/hooks/use-epoch-clock-service";
import { useEpochRollover } from "@/solana/hooks/use-epoch-rollover";

import { appBootAtom, epochAtom } from '@/state/global-atoms';
import { selectedTierAtom } from "@/state/tier-atoms";
import { liveFeedUIAtom } from "@/state/live-feed-atoms";

import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";
import FullscreenError from "@/components/FullscreenError/FullscreenError";

import AppHeader from "@/components/AppHeader/AppHeader";
import PotBar from "@/components/Left/PotBar/PotBar";
import MetaBar from "@/components/Left/MetaBar/MetaBar";
import GameInfoSection from "@/components/Center/GameInfoSection/GameInfoSection";
import BetShareBar from "@/components/Center/BetShareBar/BetShareBar";
import ChatPanel from "@/components/Right/ActivityPanel/ActivityPanel";
import NumberGrid from "@/components/Center/NumberGrid/NumberGrid";
import PlayerBetBox from "@/components/Left/PlayerBetBox/PlayerBetBox";

import styles from "./AppShell.module.scss";
import { EpochResultsModal } from "@/components/ResolvingGameModal/EpochResultsModal";
import { LastWinningNumbers } from "@/components/Center/LastWinningNumbers/LastWinningNumbers";
import { GamePanelSwitcher } from "@/components/Center/GamePanelSwitcher/GamePanelSwitcher";
import EpochSubHeader from "@/components/Left/EpochBox/EpochBox";
import BetModal from "@/components/BetModal/BetModal";
import { useResolvedGameFinaleWatcher } from "@/solana/hooks/useResolvedGameFinaleWatcher";
import { EpochTitle } from "@/components/BrowserEpochTitle/BrowserEpochTitle";
import { useCurrentSlot } from '@/solana/hooks/use-current-slot';
import { configReadyAtom } from '@/state/config-atoms';
//import IntroBannerModal from '@/components/IntroBannerModal/IntroBannerModal';
import { useWinningHistoryPrefetch } from '@/hooks/useWinningHistoryPrefetch';

//const FORCE_LOADING = true;

export default function AppShell({ children }: { children: ReactNode }) {
  const tier = useAtomValue(selectedTierAtom);
  const feed = useAtomValue(liveFeedUIAtom);
  const config = useAtomValue(configReadyAtom);
  const currentEpoch = useAtomValue(epochAtom);
  const cutoffSlot = currentEpoch?.cutoffSlot ?? null;
  const currentSlot = useCurrentSlot({ commitment: "confirmed", pollMs: 1200 });
  const pauseBet = config?.pauseBet === 1;

  const bettingClosed =
    pauseBet ||
    (cutoffSlot != null && currentSlot != null && currentSlot >= cutoffSlot);

  // Epoch Label for Browser Title
  const epochLabel: string = feed?.epochLabel ? feed.epochLabel : ""; // or feed?.currentEpoch, etc.


  // 1) Bootstrap (snapshot fetch)
  useBootstrap({ tier });

  // 2) Always-on services
  useEpochClockService();
  useEpochRollover();
  useResolvedGameFinaleWatcher({ tier, enabled: true, pollMs: 1200 });

  const boot = useAtomValue(appBootAtom);
  // const boot = FORCE_LOADING
  //   ? {
  //     status: "loading",
  //     progress: 42, // pick any value or animate
  //     message: "Designing loading screen…",
  //   }
  //   : realBoot;

  const isReady = boot.status === "ready";
  const showLoader =
    boot.status === "idle" || boot.status === "loading" || boot.status === "ready";

  // MUST be called before any early return
  useWinningHistoryPrefetch({ limit: 20, enabled: isReady });

  // Error: show only the error screen
  if (boot.status === "error") {
    return <FullscreenError message={boot.message ?? "Boot failed."} />;
  }

  return (
    <>
      <EpochTitle epoch={epochLabel} bettingClosed={bettingClosed} />

      {isReady ? (
        <>
          {/*<IntroBannerModal />*/}
          <div className={styles.starfield} aria-hidden="true">
            <div className={styles.stars} />
            <div className={styles.stars2} />
            <div className={styles.stars3} />
          </div>

          <AppHeader />

          <main className={styles.main}>
            <div className={styles.left}>
              <div className={styles.leftTop}>
                <PotBar />
                <EpochSubHeader />
                <MetaBar />
              </div>
              <PlayerBetBox />
            </div>

            <div className={styles.center}>
              <GameInfoSection />
              <BetShareBar />
              <NumberGrid />
              <section className={styles.centerBottom}>
                <div className={styles.cbLeft}>
                  <LastWinningNumbers />
                </div>
                <div className={styles.cbRight}>
                  <GamePanelSwitcher />
                </div>
              </section>
            </div>

            <div className={styles.right}>
              <ChatPanel />
            </div>

            {children}
          </main>

          {/* Global overlays/modals */}
          <BetModal />
          <EpochResultsModal />
        </>
      ) : null}

      {/* Loader overlays. It will fade + unmount itself after reaching 100. */}
      {showLoader ? <LoadingScreen boot={boot} /> : null}
    </>
  );
}