/**
 * decoder.ts
 *
 * Small, browser-safe utilities for:
 *  - reading primitive values from Solana account data (Uint8Array)
 *  - building RPC memcmp filters (for getProgramAccounts)
 *  - converting common Anchor/IDL values into stable TS types (bigint, PublicKey)
 *  - a couple lightweight UI format helpers
 *
 * IMPORTANT:
 *  - No Node-only APIs (Buffer, fs)
 *  - Keep functions pure and predictable
 */

import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import bs58 from "bs58";
import { sha256 } from '@noble/hashes/sha2';



/**
 * Anchor account discriminator = sha256("account:<name>").slice(0, 8)
 * Browser-safe (no Anchor imports).
 */
export function anchorAccountDiscriminator(name: string): Uint8Array {
  const preimage = new TextEncoder().encode(`account:${name}`);
  return sha256(preimage).slice(0, 8);
}

/**
 * Base58-encoded discriminator for RPC memcmp filters.
 */
export function anchorAccountDiscriminatorB58(name: string): string {
  return bs58.encode(anchorAccountDiscriminator(name));
}


export function hasAnchorDiscriminator(data: Uint8Array, disc8: Uint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (data[i] !== disc8[i]) return false;
  }
  return true;
}


/* =============================================================================
 * Binary Readers (Uint8Array -> JS types)
 * -----------------------------------------------------------------------------
 * Used by:
 *  - decodeBetAccount(...)
 *  - decodePredictionAccount(...)
 *  - any account decoder that uses fixed offsets
 * ============================================================================= */

/**
 * Read a 32-byte Solana public key from account data at `offset`.
 */
export function readPubkey(data: Uint8Array, offset: number): PublicKey {
  return new PublicKey(data.slice(offset, offset + 32));
}

/**
 * Read an unsigned 16-bit integer (u16) in little-endian format.
 *
 * Used for:
 *  - selections bitmasks
 *  - small counter fields stored as u16
 */
export function readU16LE(data: Uint8Array, offset: number): number {
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8);
}

/**
 * Read an unsigned 64-bit integer (u64) in little-endian format.
 *
 * Returns bigint so no precision is lost.
 * Falls back to manual read if BigInt DataView methods aren't available.
 */
export function readU64LE(data: Uint8Array, offset: number): bigint {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Modern runtimes
  if (typeof view.getBigUint64 === "function") {
    return view.getBigUint64(offset, true);
  }

  // Fallback: manual little-endian u64 -> bigint
  let x = 0n;
  for (let i = 7; i >= 0; i--) {
    x = (x << 8n) | BigInt(data[offset + i] ?? 0);
  }
  return x;
}

/**
 * Read a signed 64-bit integer (i64) in little-endian format.
 *
 * Used for:
 *  - unix timestamps stored as i64
 *  - any signed counters or deltas stored as i64
 */
export function readI64LE(data: Uint8Array, offset: number): bigint {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Modern runtimes
  if (typeof view.getBigInt64 === "function") {
    return view.getBigInt64(offset, true);
  }

  // Fallback: read as u64 then interpret as signed
  return BigInt.asIntN(64, readU64LE(data, offset));
}


/**
 * Reads a u8 array and returns the selections array.
 * @param data
 * @param offset
 */
export function readSelectionsArray(data: Uint8Array, offset: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 8; i++) {
    const v = data[offset + i];
    if (v && v !== 0) out.push(v);
  }
  return out;
}

/* =============================================================================
 * RPC Filter Builders (memcmp)
 * -----------------------------------------------------------------------------
 * Used by:
 *  - connection.getProgramAccounts(...filters)
 *  - subscription filters (onProgramAccountChange + filters)
 * ============================================================================= */

/**
 * Encode a bigint into 8 bytes little-endian (u64).
 * Internal helper for RPC memcmp filters.
 */
function u64ToLeBytes(value: bigint): Uint8Array {
  // Clamp to 64-bit unsigned range to avoid unexpected overflow.
  const v = BigInt.asUintN(64, value);

  const out = new Uint8Array(8);
  let x = v;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

/**
 * Create an RPC memcmp filter for a u64 value stored in little-endian format.
 *
 * Example:
 *  filters: [memcmpU64LE(gameEpoch, OFF_GAME_EPOCH)]
 */
export function memcmpU64LE(value: bigint, offset: number) {
  return {
    memcmp: {
      offset,
      bytes: bs58.encode(u64ToLeBytes(value)),
    },
  };
}

/**
 * Create an RPC memcmp filter for a single byte (u8).
 *
 * Example:
 *  filters: [memcmpU8(tier, OFF_TIER)]
 */
export function memcmpU8(value: number, offset: number) {
  return {
    memcmp: {
      offset,
      bytes: bs58.encode(new Uint8Array([value & 0xff])),
    },
  };
}

/* =============================================================================
 * Type Coercion Helpers (Anchor/IDL -> stable TS types)
 * -----------------------------------------------------------------------------
 * Used by:
 *  - optional Anchor coder paths
 *  - IDL-based decoding (if you ever use it)
 * ============================================================================= */

/**
 * Convert many common numeric representations into bigint.
 *
 * Handles:
 *  - bigint
 *  - number (truncated)
 *  - string integers ("123")
 *  - Anchor BN
 *
 * Returns 0n for null/undefined/unknown formats.
 */
export function toBigInt(v: unknown): bigint {
  if (typeof v === "bigint") return v;

  if (typeof v === "number") {
    // Truncate to avoid bigint from float surprises
    return BigInt(Math.trunc(v));
  }

  if (typeof v === "string") {
    // Empty string -> 0n, otherwise parse integer string
    return v.length ? BigInt(v) : 0n;
  }

  if (v == null) return 0n;

  // Anchor BN
  if (BN.isBN(v)) {
    return BigInt(v.toString(10));
  }

  // Last-resort: some libs stringify numeric objects cleanly
  if (typeof v === "object") {
    const s = String(v);
    if (/^-?\d+$/.test(s)) return BigInt(s);
  }

  return 0n;
}

/**
 * Convert "bytes-like" values into a Uint8Array.
 *
 * Handles:
 *  - Uint8Array
 *  - TypedArray views (e.g. Buffer, Uint16Array, etc.)
 *  - number[] (only if all entries are numbers)
 */
export function toU8Array(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;

  if (ArrayBuffer.isView(v)) {
    // NOTE: uses the whole underlying buffer; good enough for most IDL outputs.
    // If you ever hit an offset/length issue, we can tighten this.
    return new Uint8Array(v.buffer);
  }

  if (Array.isArray(v) && v.every((x) => typeof x === "number")) {
    return new Uint8Array(v);
  }

  return new Uint8Array();
}

/**
 * Convert any "pubkey-like" value to base58 string for logging/UI.
 */
export function toPubkeyBase58(v: unknown): string {
  if (v instanceof PublicKey) return v.toBase58();
  if (typeof v === "string") return v;
  return String(v);
}

/* =============================================================================
 * UI Formatting Helpers (optional)
 * -----------------------------------------------------------------------------
 * These are not decoders, but are handy for UI.
 * If you prefer strict separation, move these into ui/format.
 * ============================================================================= */

/**
 * Format basis points (bps) into a percent string.
 *  - 100 bps = 1%
 */
export function formatBps(bps: number | null | undefined): string {
  if (bps == null) return "—";
  return bps / 100 + "%";
}

/* =============================================================================
 * Prediction Helpers
 * ============================================================================= */

/**
 * Convert a u16 selections bitmask into an array of selected indices.
 *
 * Example:
 *   mask = (1 << 1) | (1 << 4) | (1 << 7)
 *   => [1, 4, 7]
 *
 * Used by:
 *  - decodePredictionAccount(...) to derive the selections array
 */
export function selectionsFromMask(mask: number): number[] {
  const selections: number[] = [];
  const m = mask & 0xffff; // force u16

  for (let n = 0; n < 16; n++) {
    if ((m & (1 << n)) !== 0) selections.push(n);
  }

  return selections;
}