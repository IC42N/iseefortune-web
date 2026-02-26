// src/live/livefeed-subscription.ts
import type { Connection, PublicKey, AccountInfo } from "@solana/web3.js";

export type LiveFeedAccountMeta = {
  pubkey: string;
  lamports: number;
  dataLen: number;
};

export type LiveFeedSubscriptionOptions<T> = {
  connection: Connection;
  liveFeedPda: PublicKey;

  // your existing decode pipeline ends up producing LiveFeedReady
  decode: (accountInfo: AccountInfo<Buffer>) => T;

  commitment?: "processed" | "confirmed" | "finalized";

  onUpdate: (meta: LiveFeedAccountMeta, decoded: T) => void;
  onError?: (err: unknown) => void;
};

export function subscribeLiveFeed<T>(opts: LiveFeedSubscriptionOptions<T>): () => void {
  const {
    connection,
    liveFeedPda,
    decode,
    onUpdate,
    onError,
  } = opts;

  const id = connection.onAccountChange(
    liveFeedPda,
    (accountInfo) => {
      try {
        const meta: LiveFeedAccountMeta = {
          pubkey: liveFeedPda.toBase58(),
          lamports: accountInfo.lamports,
          dataLen: accountInfo.data.length,
        };

        const decoded = decode(accountInfo);
        onUpdate(meta, decoded);
      } catch (e) {
        onError?.(e);
      }
    },
    { commitment: "confirmed" }
  );

  return () => {
    // fire-and-forget; ignore errors on teardown
    connection.removeAccountChangeListener(id).catch(() => {});
  };
}