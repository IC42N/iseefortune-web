import bs58 from 'bs58';

export function decodeProofItem(s: string): Uint8Array {
  const t = s.trim();

  // HEX (64 chars), allow 0x prefix
  const hex = t.startsWith("0x") ? t.slice(2) : t;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    const b = Buffer.from(hex, "hex");
    if (b.length !== 32) throw new Error(`Proof item hex decoded to ${b.length} bytes (expected 32).`);
    return b;
  }

  // BASE64 (32 bytes -> typically 44 chars with == padding, but don't rely purely on length)
  // Try base64 if it looks base64-ish
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(t)) {
    try {
      const b = Buffer.from(t, "base64");
      if (b.length === 32) return b;
    } catch {
      // fall through
    }
  }

  // BASE58 (common in Solana world)
  try {
    const b = bs58.decode(t);
    if (b.length !== 32) {
      throw new Error(`Proof item base58 decoded to ${b.length} bytes (expected 32).`);
    }
    return b;
  } catch (e) {
    throw new Error(`Proof item is not valid hex/base64/base58 32 bytes: "${t.slice(0, 16)}..."`);
  }
}

export function decodeProof(proof: string[]): number[][] {
  return proof.map((p, i) => {
    const bytes = decodeProofItem(p);
    if (bytes.length !== 32) {
      throw new Error(`Proof[${i}] must be 32 bytes, got ${bytes.length}`);
    }
    return Array.from(bytes);
  });
}