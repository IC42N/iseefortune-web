export type ResultTone =
  | "hype"
  | "encouraging"
  | "sympathetic"
  | "playful"
  | "cosmic"
  | "streak"
  | "neutral";

export type ResultCopyContext = {
  outcome: "win" | "miss";
  betLamports?: bigint | null;
  payoutLamports?: bigint | null;
  winStreak?: number | null;
  isRollover?: boolean | null;
  seed?: string | number; // stable randomness per epoch/wallet
};

export type ResultCopy = {
  tone: ResultTone;
  headline: string;
  body?: string;
};

type CopyLine = Readonly<{
  headline: string;
  body?: string;
}>;

type MissTone = Extract<
  ResultTone,
  "encouraging" | "sympathetic" | "playful" | "cosmic" | "neutral"
>;

type WinTone = Extract<ResultTone, "hype" | "cosmic" | "streak" | "neutral">;

const MISS: Readonly<Record<MissTone, readonly CopyLine[]>> = {
  encouraging: [
    { headline: "So close", body: "Next epoch is yours" },
    { headline: "Not this time", body: "Run it back next round" },
    { headline: "Missed it", body: "Odds reset next epoch" },
    { headline: "No hit", body: "Keep your aim — it’s coming" },
  ],
  sympathetic: [
    { headline: "Oof that hurts", body: "Sorry — better luck next epoch" },
    { headline: "Rough miss", body: "We feel that one" },
    { headline: "Painful", body: "Shake it off — next round" },
  ],
  playful: [
    { headline: "The dice said no", body: "Try again next epoch" },
    { headline: "Fate blinked", body: "Just not your way" },
    { headline: "That one slipped", body: "Next epoch soon" },
  ],
  cosmic: [
    { headline: "The gods chose a different path", body: "Their favor shifts with time" },
    { headline: "The stars aligned elsewhere", body: "Next epoch, new fate" },
    { headline: "The gods listened…", body: "But answered another name" },
    { headline: "The gods demand more conviction", body: "The offering was not yet enough" },
  ],
  neutral: [
    { headline: "Missed this round", body: "Try again next epoch" },
    { headline: "No hit this time", body: "Next round soon" },
  ],
};

const WIN: Readonly<Record<WinTone, readonly CopyLine[]>> = {
  hype: [
    { headline: "Chosen", body: "Luck favored you" },
    { headline: "Perfect call", body: "That was no accident" },
    { headline: "Nailed it", body: "Perfect execution" },
    { headline: "Victory", body: "Fate aligned in your favor" },
    { headline: "You won!", body: "That’s a clean hit" },
    { headline: "Winner", body: "Winner winner chicken dinner" },
    { headline: "Boom!", body: "You called it" },
  ],
  cosmic: [
    { headline: "Divine favor", body: "You are on the right path" },
    { headline: "The gods chose you", body: "Fate aligned in your favor" },
    { headline: "The stars aligned", body: "This moment was written" },
    { headline: "Destiny delivered", body: "You were meant for this" },
    { headline: "The stars chose you", body: "This moment was written" },
  ],
  streak: [
    { headline: "The gods are watching", body: "You’re on their path now" },
    { headline: "The streak continues", body: "Keep the momentum going" },
    { headline: "Blessed again", body: "This isn’t random anymore" },
  ],
  neutral: [{ headline: "You won", body: "" }],
};

type RolloverTone = Extract<ResultTone, "cosmic" | "neutral">;

const ROLLOVER: Readonly<Record<RolloverTone, readonly CopyLine[]>> = {
  cosmic: [
    { headline: "The gods turned the page", body: "The story continues" },
    { headline: "The gods postponed the verdict", body: "Return next epoch" },
    {
      headline: "The pot hungers",
      body: "The offering wasn’t enough to force a verdict It pulls us into the next epoch",
    },
    {
      headline: "Verdict delayed",
      body: "The cosmos withholds the answer More conviction is required",
    },
    {
      headline: "Deeper gravity",
      body: "The pot demands more The outcome slips into the next epoch — deeper we go",
    },
  ],
  neutral: [
    { headline: "Rollover", body: "No final verdict this round Moving on to the next epoch" },
  ],
};

// ---------- helpers ----------
function hashSeedToInt(seed: string | number | undefined): number {
  const s = seed == null ? "0" : String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seedInt: number): T {
  return arr[seedInt % arr.length]!;
}

function lamportsToSolForThresholds(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000;
}

function chooseMissTone(ctx: ResultCopyContext): MissTone {
  const betSol = ctx.betLamports ? lamportsToSolForThresholds(ctx.betLamports) : 0;
  return betSol >= 1 ? "sympathetic" : "encouraging";
}

function maybeSpiceEncouragingTone(base: MissTone, seedInt: number): MissTone {
  if (base !== "encouraging") return base;

  // Rare swaps so it doesn’t get repetitive:
  // 10% cosmic, 10% playful
  const r = seedInt % 20; // 0..19
  if (r === 0 || r === 1) return "cosmic";
  if (r === 2 || r === 3) return "playful";
  return base;
}

function chooseRolloverTone(seedInt: number): RolloverTone {
  return seedInt % 10 < 8 ? "cosmic" : "neutral";
}

function chooseWinTone(ctx: ResultCopyContext, seedInt: number): WinTone {
  const streak = ctx.winStreak ?? 0;
  if (streak >= 2) return "streak"; // feels earned, not spammy

  const payoutSol = ctx.payoutLamports ? lamportsToSolForThresholds(ctx.payoutLamports) : 0;

  // small wins: sometimes cosmic to keep it flavorful
  if (payoutSol > 0 && payoutSol < 1) return seedInt % 5 === 0 ? "cosmic" : "neutral";

  // bigger wins: hype
  if (payoutSol >= 1) return "hype";

  return "neutral";
}

// ---------- main ----------
export function getResultCopy(ctx: ResultCopyContext): ResultCopy {
  const seedInt = hashSeedToInt(ctx.seed);

  if (ctx.isRollover) {
    const tone = chooseRolloverTone(seedInt);
    const line = pick(ROLLOVER[tone], seedInt);
    return { tone, headline: line.headline, body: line.body };
  }

  if (ctx.outcome === "win") {
    const tone = chooseWinTone(ctx, seedInt);
    const line = pick(WIN[tone], seedInt);
    return { tone, headline: line.headline, body: line.body };
  }

  const baseTone = chooseMissTone(ctx);
  const tone = maybeSpiceEncouragingTone(baseTone, seedInt);
  const line = pick(MISS[tone], seedInt);

  return { tone, headline: line.headline, body: line.body };
}