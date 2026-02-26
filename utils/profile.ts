export function generateHandleFromWalletPubKey(pubkey: string): string {
  if (!pubkey || pubkey.length < 8) {
    return pubkey.toUpperCase();
  }
  return `${pubkey.slice(0, 4)}${pubkey.slice(-4)}`.toUpperCase();
}

/**
 * Represents a player's level state derived from total XP.
 *
 * This type is intentionally minimal and serializable, so it can be:
 * - Used in UI components
 * - Logged or stored
 * - Recomputed deterministically anywhere
 */
export type LevelProgress = {
  /** Current player level (starts at 1) */
  level: number;

  /** XP earned toward the next level */
  inLevel: bigint;

  /** XP required to reach the next level from the current level */
  perLevel: bigint;

  /** Percentage progress toward the next level (0–100) */
  pct: number;
};


/**
 * Converts total accumulated XP into a player level and progress state
 * using a soft-ramp leveling curve.
 *
 * Leveling Model:
 * - Level progression starts at level 1.
 * - XP required to advance to the next level increases linearly.
 * - Formula:
 *     xpForNextLevel = base + (level * slope)
 *
 * With defaults:
 * - base = 20 XP
 * - slope = 2 XP per level
 *
 * Examples:
 * - Level 1 → 2 requires 22 XP
 * - Level 2 → 3 requires 24 XP
 * - Level 10 → 11 requires 40 XP
 * - Level 50 → 51 requires 120 XP
 *
 * This curve is designed to:
 * - Feel fast early for new players
 * - Scale smoothly without the exponential grind
 * - Preserve long-term prestige for high levels
 * - Remain deterministic and easy to verify
 *
 * @param xp - Total accumulated XP (BigInt for safety and on-chain parity)
 * @returns An object describing the player's current level and progress:
 *   - level:        Current player level (starts at 1)
 *   - inLevel:      XP earned toward the next level
 *   - perLevel:     XP required to reach the next level
 *   - pct:          Percentage progress toward the next level (0–100)
 */
export function xpToLevel(xp: bigint): LevelProgress {
  // Base XP required for early levels
  const base = 20n;

  // Additional XP added per level to create a soft ramp
  const slope = 2n;

  // Player levels start at 1 (not 0)
  let level = 1;

  // Remaining XP after accounting for completed levels
  let remaining = xp;

  while (true) {
    // XP required to advance from the current level to the next
    const costForNext = base + BigInt(level) * slope;

    // If the player does not have enough XP to level up,
    // return the current level and progress state
    if (remaining < costForNext) {
      const pct = Number((remaining * 100n) / costForNext);

      return {
        level,
        inLevel: remaining,
        perLevel: costForNext,
        pct,
      };
    }

    // Otherwise, consume XP and advance to the next level
    remaining -= costForNext;
    level++;
  }
}

// Is this player a genesis player?
export function isPlayerGenesisPlayer(firstEpoch: bigint) {
  const GENESIS_PER_PLAYER_MAX = 930;
  return firstEpoch <= GENESIS_PER_PLAYER_MAX;
}


// Get rank SVG
export function getRank(isGenesis: boolean, level: number) {
  if(isGenesis) return {
    name: "Genesis",
    image: "/ranks/genesis.svg"
  };

  else if(level <= 8) return {
    name: `Level ${level}`,
    image: `/ranks/r${level}.svg`
  }

  // Super rank higher than level 8
  return {
    name: "God",
    image: `/ranks/god.svg`
  }
}