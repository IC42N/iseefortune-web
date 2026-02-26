

/**
 * Convert lamports to a human-friendly SOL string.
 *
 * - Converts lamports → SOL
 * - Limits to 2 decimal places
 * - Trims trailing zeros (e.g. "1.00" → "1", "1.50" → "1.5")
 *
 * ⚠️ Display-only helpers. Not intended for precise math.
 */
export function lamportsToSolTextTrim(lamports: bigint) {
  const sol = Number(lamports) / 1e9;
  return sol.toFixed(3).replace(/\.?0+$/, "");
}

function truncateDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.floor(value * factor) / factor;
}


export function shortPk(pk: string, head = 4, tail = 4) {
  if (!pk) return "";
  if (pk.length <= head + tail + 3) return pk.toUpperCase();
  return `${pk.slice(0, head)}${pk.slice(-tail)}`.toUpperCase();
}

export function lamportsToSol(lamportsStr: string): string {
  // lamports is u64 returned as string
  try {
    const lamports = BigInt(lamportsStr);
    // 1 SOL = 1_000_000_000 lamports
    const sol = Number(lamports) / 1_000_000_000;
    // keep it readable
    return sol.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return lamportsStr;
  }
}


export function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatBigInt(n: bigint): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Safe lamports->SOL string without Number() overflow
export function formatLamportsToSol(lamports: bigint, maxDecimals = 4): string {
  const SOL = 1_000_000_000n;

  if (lamports === 0n) return "0";

  const whole = lamports / SOL;
  const frac = lamports % SOL;

  if (frac === 0n) return whole.toString();

  const scale = 10n ** BigInt(maxDecimals);
  const fracScaled = (frac * scale) / SOL;

  // pad then trim trailing zeros
  let fracStr = fracScaled.toString().padStart(maxDecimals, "0");
  fracStr = fracStr.replace(/0+$/, "");

  // if everything got trimmed, it's an integer
  if (fracStr.length === 0) return whole.toString();

  return `${whole.toString()}.${fracStr}`;
}

export function formatLamportsToSolNumber(
  lamports: number,
  maxDecimals = 4
): string {
  const SOL = 1_000_000_000;

  if (!Number.isFinite(lamports) || lamports === 0) return "0";

  const sol = lamports / SOL;

  // Format with fixed decimals, then trim
  let s = sol.toFixed(maxDecimals);
  s = s.replace(/\.?0+$/, "");

  return s;
}

export function truncateBase58(addr: string, left = 4, right = 4): string {
  if (addr.length <= left + right) return addr;
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}


export function decimalsNeededForLamports(lamports: bigint, maxDecimals = 4): number {
  const SOL = 1_000_000_000n;
  const frac = lamports % SOL;
  if (frac === 0n) return 0;

  // look at fractional digits up to maxDecimals and trim trailing zeros
  const scale = 10n ** BigInt(maxDecimals);
  const fracScaled = (frac * scale) / SOL;

  let s = fracScaled.toString().padStart(maxDecimals, "0");
  s = s.replace(/0+$/, ""); // trim trailing zeros
  return s.length; // 1..maxDecimals
}

export function formatLamportsToSolFixedDecimals(lamports: bigint, decimals: number): string {
  const SOL = 1_000_000_000n;
  const whole = lamports / SOL;
  const frac = lamports % SOL;

  if (decimals <= 0) return whole.toString();

  const scale = 10n ** BigInt(decimals);
  const fracScaled = (frac * scale) / SOL;
  const fracStr = fracScaled.toString().padStart(decimals, "0");

  return `${whole.toString()}.${fracStr}`;
}

// quantum (step) in lamports for a given decimals count
export function lamportQuantumForDecimals(decimals: number): bigint {
  // 1 SOL = 1e9 lamports
  // decimals=4 => step = 1e(9-4)=1e5 lamports => 0.0001 SOL
  if (decimals <= 0) return 1_000_000_000n; // step whole SOL
  const pow = 9 - decimals;
  return 10n ** BigInt(pow);
}


export function lamportsToSolTextFloor(lamports: bigint, maxDecimals = 6) {
  const neg = lamports < 0n;
  const x = neg ? -lamports : lamports;

  const SOL = 1_000_000_000n;
  const whole = x / SOL;
  const frac = x % SOL;

  const fracStr9 = frac.toString().padStart(9, "0");
  const cut = fracStr9.slice(0, maxDecimals).replace(/0+$/, "");

  const out = cut.length ? `${whole.toString()}.${cut}` : whole.toString();
  return neg ? `-${out}` : out;
}