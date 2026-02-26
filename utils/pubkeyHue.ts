// Deterministically convert a string -> 0..359 hue
export function hueFromPubkey(pubkey: string): number {
  // FNV-1a 32-bit hash (fast, stable, good enough)
  let h = 0x811c9dc5;

  for (let i = 0; i < pubkey.length; i++) {
    h ^= pubkey.charCodeAt(i);
    // h *= 16777619 with 32-bit overflow
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }

  return h % 360;
}