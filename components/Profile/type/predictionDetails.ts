export type predictionDetailsStatus = "idle" | "loading" | "ready" | "error";

export type PredictionDetails = {
  status: predictionDetailsStatus;
  error?: string;

  // Needed for claiming / lookup
  epoch?: bigint;
  tier?: number;

  winningNumber?: number;
  arweaveUrl?: string;
  hasClaimed?: boolean;
  claimedAt?: bigint;

  // winner (from profile-fetch-results)
  isWinner?: boolean;
  payoutLamports?: bigint;
  proof?: string[];
  winnerIndex?: number;
  totalPotLamports?: bigint;

  // tickets (from profile-fetch-results)
  ticketAward?: {
    placedSlot: number;
    lamports: bigint;
    rewarded: number;
  };

  // -------------------------
  // Wager breakdown (NEW)
  // -------------------------

  /** Total lamports the user wagered for this prediction (all selections combined). */
  wagerTotalLamports?: bigint;

  /** How many numbers were selected for this prediction. */
  selectionCount?: number;

  /** Evenly split contribution per selected number. */
  wagerPerSelectionLamports?: bigint;

  /**
   * ROI percent relative to amount put in (payout vs wager).
   * Example: +25 means +25% profit; -100 means full loss.
   * Only meaningful when wagerTotalLamports is present.
   */
  roiPercent?: number;
};