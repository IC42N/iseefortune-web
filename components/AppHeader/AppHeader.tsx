"use client";

import { useAtom, useAtomValue } from 'jotai';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { appReadyAtom, globalBootAtom } from '@/state/global-atoms';
import { availableTiersAtom, selectedTierAtom, tierBootAtom } from '@/state/tier-atoms';
import styles from "./AppHeader.module.scss";
import { useEffect } from 'react';
import { liveFeedUIAtom } from '@/state/live-feed-atoms';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import HeaderHelpMenu from '@/components/HeaderHelpMenu/HeaderHelpMenu';
import HeaderProfileMenu from '../HeaderProfileMenu/HeaderProfileMenu';


export default function AppHeader() {
  const globalBoot = useAtomValue(globalBootAtom);
  const tierBoot = useAtomValue(tierBootAtom);
  const liveFeed = useAtomValue(liveFeedUIAtom);

  const [tier, setTier] = useAtom(selectedTierAtom);
  const tiers = useAtomValue(availableTiersAtom);

  const globalsReady = globalBoot.status === "ready";
  const tierLoading = tierBoot.status === "loading";
  const appReady = useAtomValue(appReadyAtom);

  const { connected } = useWallet();

  useEffect(() => {
    if (!tiers.includes(tier)) {
      setTier(tiers[0] ?? 1);
    }
  }, [tiers, tier, setTier]);

  const meta = (
    <div className={styles.gameMeta}>
      <div className={styles.epoch}>
        <span className={styles.label}>Epoch Game</span>
        <span className={styles.value}>#{liveFeed?.epochLabel ? liveFeed.epochLabel : "—"}</span>
      </div>
    </div>
  );

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <div className={styles.left}>
          <Image src="/logo/SVG/ball-1-gold.svg" alt="" width={30} height={50} className={styles.crystalBall} />
          <div className={styles.titleSub}>
            <div className={styles.title}>I SEE FORTUNE</div>
            <div className={styles.sub}>Epoch game of the future</div>
          </div>
        </div>

        <div className={styles.center}>
          {meta}
        </div>

        <div className={styles.right}>
          <div className={styles.tierWrap}>
            <select
              className={styles.select}
              value={tier}
              disabled={!globalsReady || tierLoading || !appReady}
              onChange={(e) => setTier(Number(e.target.value))}
            >
              {tiers.map((t) => (
                <option key={t} value={t}>
                  Tier {t}
                </option>
              ))}
            </select>
          </div>

          {!connected ? (
            <>
              <HeaderHelpMenu isMobile={false} />
              {appReady ? (
                <div className={styles.topWalletBox}>
                  <WalletMultiButton className="wallet-button" />
                </div>
              ) : (
              <div className={styles.walletPlaceholder} />
              )}
            </>
          ) : (
            <HeaderProfileMenu
              appReady={appReady}
              // wire this later to your responsive hook
              isMobile={false}
              // optional: pass a function here later to open your activity/chat side panel
              //onOpenActivityPanel={() => setChatOpen(true)}
            />
          )}
        </div>
      </div>

      <div className={styles.subHeader}>
        {meta}
      </div>
    </header>
  );
}