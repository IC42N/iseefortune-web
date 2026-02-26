import type { AnchorProvider } from "@coral-xyz/anchor";
import {
  Connection,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  type Commitment,
  type TransactionInstruction,
  SendTransactionError,
  PublicKey,
} from "@solana/web3.js";
import { toErrMsg } from "@/utils/error";

import type {
  RpcResponseAndContext,
  SimulatedTransactionResponse,
  SimulateTransactionConfig,
} from "@solana/web3.js";

function isVersionedTx(tx: AnyTx): tx is VersionedTransaction {
  return tx instanceof VersionedTransaction;
}

async function simulateSignedTx(
  connection: Connection,
  tx: Transaction,
): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
  // Legacy overload: (transactionOrMessage: Message | Transaction, signers?, includeAccounts?)
  // We don't pass config because this overload doesn't accept it in this typing.
  return connection.simulateTransaction(tx);
}

async function simulateSignedV0Tx(
  connection: Connection,
  tx: VersionedTransaction,
  cfg: SimulateTransactionConfig,
): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
  // Versioned overload: (transaction: VersionedTransaction, config?)
  return connection.simulateTransaction(tx, cfg);
}


export type SendTxCallbacks = {
  onBeforeSign?: () => void;
  onAfterSign?: () => void;
  onAfterSend?: (sig: string) => void;
};

type AnyTx = Transaction | VersionedTransaction;

export type SendTxResult =
  | { ok: true; signature: string }
  | { ok: false; reason: "USER_REJECTED" }
  | { ok: false; reason: "FAILED"; message: string };

export type SendTxOpts = {
  commitment?: Commitment;
  maxRetries?: number;
  skipPreflight?: boolean;
  useV0?: boolean;

  // enable noisy logs when debugging
  debug?: boolean;
};

type WalletErrorLike = {
  code?: number;
  message?: string;
  error?: { code?: number; message?: string };
};

export function isUserRejected(e: unknown): boolean {
  if (e instanceof Error) {
    const m = e.message.toLowerCase();
    if (
      m.includes("user rejected") ||
      m.includes("rejected") ||
      m.includes("declined") ||
      m.includes("cancel") ||
      m.includes("denied")
    ) return true;
  }

  if (typeof e === "object" && e !== null) {
    const err = e as WalletErrorLike;
    if (err.code === 4001 || err.error?.code === 4001) return true;
    const msg = err.message ?? err.error?.message;
    if (msg && msg.toLowerCase().includes("reject")) return true;
  }

  return false;
}

function safeJson(x: unknown) {
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

function short(pk: PublicKey) {
  const s = pk.toBase58();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function dumpInstructions(ixs: TransactionInstruction[]) {
  console.log(`ix count: ${ixs.length}`);
  ixs.forEach((ix, i) => {
    const writable = ix.keys.filter((k) => k.isWritable).map((k) => short(k.pubkey));
    const signers = ix.keys.filter((k) => k.isSigner).map((k) => short(k.pubkey));
    console.log(
      `ix[${i}] program=${short(ix.programId)} keys=${ix.keys.length} writable=[${writable.join(
        ", "
      )}] signers=[${signers.join(", ")}]`
    );
  });
}

function dumpTxAccounts(tx: AnyTx) {
  if (isVersionedTx(tx)) {
    // static keys are always present; loaded keys exist after address lookup tables (not here)
    const keys = tx.message.getAccountKeys().staticAccountKeys;
    console.log(`tx=v0 staticAccountKeys(${keys.length}):`, keys.map((k) => short(k)).join(" "));
    return;
  }

  const keys = tx.compileMessage().accountKeys;
  console.log(`tx=legacy accountKeys(${keys.length}):`, keys.map((k) => short(k)).join(" "));
}

function logErr(prefix: string, e: unknown) {
  const base =
    e instanceof Error
      ? { name: e.name, message: e.message, stack: e.stack }
      : { value: e };
  console.error(prefix, base, "raw:", e);
}


export async function sendAndConfirmTx(args: {
  connection: Connection;
  provider: AnchorProvider;
  ixs: TransactionInstruction[];
  opts?: SendTxOpts;
  cb?: SendTxCallbacks;
}): Promise<SendTxResult> {
  const { provider, ixs, opts, connection, cb } = args;

  const commitment = opts?.commitment ?? "confirmed";
  const maxRetries = opts?.maxRetries ?? 2;
  const skipPreflight = opts?.skipPreflight ?? false;
  const useV0 = opts?.useV0 ?? true;
  const debug = opts?.debug ?? false;

  // --- PAYER: log both, then choose the wallet one (most correct) ---
  const payerFromProvider = provider.publicKey ?? null;
  const payerFromWallet = provider.wallet?.publicKey ?? null;

  const payer = payerFromWallet ?? payerFromProvider;

  if (!payer) {
    return { ok: false, reason: "FAILED", message: "Wallet not connected." };
  }

  if (debug) {
    console.log("---- sendAndConfirmTx DEBUG ----");
    console.log("rpc endpoint:", connection?.rpcEndpoint ?? "(unknown)");
    console.log("commitment:", commitment, "useV0:", useV0, "skipPreflight:", skipPreflight);
    console.log("payer(provider.publicKey):", payerFromProvider?.toBase58() ?? "(null)");
    console.log("payer(provider.wallet.publicKey):", payerFromWallet?.toBase58() ?? "(null)");
    console.log("payer(chosen):", payer.toBase58());
    if (payerFromProvider && payerFromWallet && !payerFromProvider.equals(payerFromWallet)) {
      console.warn("⚠️ payer mismatch: provider.publicKey != provider.wallet.publicKey");
    }

    // instruction info (helps find unexpected debits)
    dumpInstructions(ixs);

    // payer balance (most common real failure)
    try {
      const bal = await connection.getBalance(payer, commitment);
      console.log("payer balance (lamports):", bal);
    } catch (e) {
      logErr("payer balance fetch failed:", e);
    }
  }

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (debug) console.log(`---- attempt ${attempt + 1}/${maxRetries + 1} ----`);

      const latest = await connection.getLatestBlockhash(commitment);
      if (debug) {
        console.log("latest blockhash:", latest.blockhash);
        console.log("lastValidBlockHeight:", latest.lastValidBlockHeight);
      }

      let tx: AnyTx;

      if (useV0) {
        const msg = new TransactionMessage({
          payerKey: payer,
          recentBlockhash: latest.blockhash,
          instructions: ixs,
        }).compileToV0Message();
        tx = new VersionedTransaction(msg);
      } else {
        const legacy = new Transaction();
        legacy.feePayer = payer;
        legacy.recentBlockhash = latest.blockhash;
        legacy.add(...ixs);
        tx = legacy;
      }

      if (debug) dumpTxAccounts(tx);

      cb?.onBeforeSign?.();

      let signed: AnyTx;
      try {
        signed = await provider.wallet.signTransaction<AnyTx>(tx);
      } catch (e) {
        if (isUserRejected(e)) return { ok: false, reason: "USER_REJECTED" };
        return { ok: false, reason: "FAILED", message: toErrMsg(e) };
      }

      cb?.onAfterSign?.();

      // ---- Manual simulation (prints err + logs even when getLogs() is empty) ----
      if (debug) {
        try {
          let sim:
            | RpcResponseAndContext<SimulatedTransactionResponse>
            | null = null;

          if (isVersionedTx(signed)) {
            const cfg: SimulateTransactionConfig = {
              sigVerify: false,
              replaceRecentBlockhash: true,
              commitment,
            };

            sim = await simulateSignedV0Tx(connection, signed, cfg);
          } else {
            sim = await simulateSignedTx(connection, signed);
          }

          console.log("SIM err:", safeJson(sim.value.err));
          console.log("SIM logs:", sim.value.logs ?? []);
          console.log("SIM units:", sim.value.unitsConsumed ?? null);
        } catch (e) {
          logErr("simulateTransaction failed:", e);
        }
      }

      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight,
        maxRetries: 0,
      });

      cb?.onAfterSend?.(sig);
      if (debug) console.log("sig:", sig);

      const res = await connection.confirmTransaction(
        {
          signature: sig,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        commitment
      );

      if (res.value.err) {
        if (debug) console.error("confirm err:", safeJson(res.value.err));
        return {
          ok: false,
          reason: "FAILED",
          message: `Transaction executed but failed: ${safeJson(res.value.err)}`,
        };
      }

      return { ok: true, signature: sig };
    } catch (e) {
      lastErr = e;

      if (e instanceof SendTransactionError) {
        try {
          const logs = await e.getLogs(connection);
          console.error("SendTransactionError.getLogs():", logs ?? []);
        } catch (e2) {
          logErr("getLogs() failed:", e2);
        }
      }

      logErr("sendAndConfirmTx caught error:", e);

      if (attempt === maxRetries) break;
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }

  return {
    ok: false,
    reason: "FAILED",
    message: `Transaction failed after retries: ${toErrMsg(lastErr)}`,
  };
}