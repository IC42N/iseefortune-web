export type BetQuipInput = {
  // Core
  playersOnNumber: number | null;      // how many unique players on this number
  betLamports: bigint | null;          // user's bet
  payoutLamports: bigint | null;       // est payout if win (your estimatePayout output)
  shareBps: number | null;             // 0..10000 (optional but useful)

  // Averages (pick one — global avg is simplest)
  minLamports: bigint | null;
  maxLamports: bigint | null;

  // Optional extras
  isBettingClosed?: boolean;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const safeNum = (b: bigint) => Number(b); // ok for small-ish lamports; you're using 0.01 SOL steps

function crowdBand(players: number) {
  if (players <= 0) return "none";
  if (players === 1) return "solo";
  if (players <= 5) return "a_little";
  if (players <= 20) return "some";
  return "many";
}

function pctFromBps(bps: number) {
  return clamp(bps / 100, 0, 100);
}

export function getBetQuip(i: BetQuipInput): string | null {
  if (i.isBettingClosed) return "Betting is closed for this round.";
  if (i.betLamports == null || i.betLamports <= 0n) return null;

  const players = i.playersOnNumber ?? null;

  // ---- 1) Crowd message (FUN, based on player count) ----
  let crowdMsg: string | null = null;

  if (players == null) {
    crowdMsg = null; // if you don't have the count yet, skip it
  } else {
    switch (crowdBand(players)) {
      case "none":
        crowdMsg = "No one’s here… you’re the first one in.";
        break;
      case "solo":
        crowdMsg = "Just you and one other soul. Interesting.";
        break;
      case "a_little":
        crowdMsg = "A few people are sniffing this number. Nice and quiet.";
        break;
      case "some":
        crowdMsg = "Some traffic on this one — not too crowded, not empty.";
        break;
      case "many":
        crowdMsg = "Crowd favorite. You’re definitely not alone.";
        break;
    }
  }

  // ---- 2) Return / position message (based on payout multiple and share%) ----
  let returnMsg: string | null = null;

  const sharePct = i.shareBps != null ? pctFromBps(i.shareBps) : null;

  // payout multiple is the most intuitive “return on bet size” signal
  let mult: number | null = null;
  if (i.payoutLamports != null) {
    const bet = safeNum(i.betLamports);
    const payout = safeNum(i.payoutLamports);
    mult = bet > 0 ? payout / bet : null;
    if (mult != null && !Number.isFinite(mult)) mult = null;
  }

  if (mult != null) {
    if (mult < 1.15) returnMsg = "Low upside right now — you’re not getting much leverage here.";
    else if (mult < 1.6) returnMsg = "Decent return — steady, not explosive.";
    else if (mult < 2.5) returnMsg = "Strong return — this is a good-looking position.";
    else returnMsg = "Big upside — this could be a spicy hit.";
  } else if (sharePct != null) {
    // fallback if you don’t want to use payoutLamports for some reason
    if (sharePct < 1) returnMsg = "Your share is tiny — tough to win big here unless you size up.";
    else if (sharePct < 3) returnMsg = "You’ve got a small slice — still playable.";
    else if (sharePct < 8) returnMsg = "Nice slice of the pie — this is shaping up well.";
    else returnMsg = "Great share — you’re positioned well.";
  }

  // ---- 3) Bet size vs average (the “seeing the future” line) ----
  let sizeMsg: string | null = null;

  if (i.minLamports != null && i.maxLamports != null && i.betLamports != null) {
    const min = safeNum(i.minLamports);
    const max = safeNum(i.maxLamports);
    const bet = safeNum(i.betLamports);

    if (max > min) {
      const t = clamp((bet - min) / (max - min), 0, 1); // 0 = min, 1 = max

      if (t >= 0.9) {
        sizeMsg = "Ah… I see you’re seeing the future now. Secure your position.";
      } else if (t >= 0.7) {
        sizeMsg = "Big conviction. You’re stacking the odds in your favor.";
      } else if (t <= 0.15) {
        sizeMsg = "Light tap — small risk, small reward.";
      }
    }
  }

  // ---- Compose (keep it punchy, max 2–3 short sentences) ----
  const parts = [crowdMsg, returnMsg, sizeMsg].filter(Boolean) as string[];

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  // Prefer crowd + return; size is the “bonus tag”
  // If all 3 exist, keep it tight by joining with spaces.
  return parts.slice(0, 3).join(" ");
}