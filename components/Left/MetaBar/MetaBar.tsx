"use client";

import { useAtomValue } from "jotai";
import { liveFeedUIAtom } from "@/state/live-feed-atoms";
import { configUIAtom } from "@/state/config-atoms";
import { selectedTierSettingsUiAtom } from "@/state/tier-atoms";
import { InfoTooltip } from "@/components/ui/InfoTooltop/InfoToolTip";
import styles from "./MetaBar.module.scss";

export default function MetaBar() {
  const feed = useAtomValue(liveFeedUIAtom);
  const config = useAtomValue(configUIAtom);
  const tier = useAtomValue(selectedTierSettingsUiAtom);

  const isReady = !!feed && !!config;

  const primaryRollover = config?.primaryRollOverNumber ?? 0;
  const secondaryRollover = feed?.rolloverText;

  const rolloverDisplay = (
    <div className={styles.tiers}>
      {primaryRollover != null && (
        <div className={styles.tierBadge}>{primaryRollover}</div>
      )}
      {secondaryRollover && (
        <div className={styles.tierBadge}>{secondaryRollover}</div>
      )}
    </div>
  );

  const takerFee = feed?.fee ?? 0;
  const minTakerFee = config?.minFeeBps ?? 0;
  const takerFeeDrop = config?.rolloverFeeStepBps;

  const rolloverTooltip =
    takerFee > 0 && takerFee > minTakerFee
      ? `If the next winning number is a rollover, all predictions and the entire pot carries over to next epoch. As a bonus on this rare event, the taker fee drops by ${takerFeeDrop}.`
      : `If the next winning number is a rollover, all predictions and the entire pot carries over to next epoch.`;

  return (
    <section className={styles.metaBar}>
      {/* Rollover */}
      <div className={styles.metaSection}>
        <div className={styles.label}>
          Rollover
          <InfoTooltip title="Rollover" description={rolloverTooltip} />
        </div>
        <div className={styles.value}>
          {isReady ? rolloverDisplay : ""}
        </div>
      </div>

      {/* Bet Range */}
      <div className={styles.metaSection}>
        <div className={styles.label}>
          Tier Range
          <InfoTooltip
            title="Bet Range"
            description="When you win, the amount you contribute to that winning number is the same percentage you will receive of the entire pot. Each game tier has a minimum and maximum conviction amount to prevent whales from eclipsing smaller bets."
          />
        </div>
        <div className={styles.value}>
          {isReady ? tier?.rangeDisplay : ""}
        </div>
      </div>


      {/* Taker Fee */}
      <div className={styles.metaSection}>
        <div className={styles.label}>
          Taker Fee
          <InfoTooltip
            title="Taker Fee"
            description="The fee deducted from the gross pot once a game has any number of winners. Can decreases on rollovers."
          />
        </div>
        <div className={styles.value}>
          {isReady ? feed?.feeText : ""}
        </div>
      </div>



      {/* Tickets AWD */}
      <div className={styles.metaSection}>
        <div className={styles.label}>
          Tickets
          <InfoTooltip
            title="Change Tickets Awarded"
            description="Change tickets are awarded to missed predictions, prioritized by earliest entries. This percentage indicates what portion of losing entries receive change tickets."
          />
        </div>
        <div className={styles.value}>
          {isReady ? tier?.ticketReward : ""}
        </div>
      </div>
    </section>
  );
}