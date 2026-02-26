import type { AnchorProvider } from "@coral-xyz/anchor";
import type { Ic42nProgram } from "@/solana/anchor-client";
import { claimWithComputeBudget } from '@/solana/tx/tx-options';
import { sendAndConfirmTx, SendTxResult } from '@/solana/tx/send-transaction';
import { sendConnection } from "@/solana/tx/send-connection";
import { toErrMsg } from '@/utils/error';
import { buildClaimIx, ClaimData } from '@/solana/tx/claim/build-claim-ix';

export async function submitClaimTx(args: {
  program: Ic42nProgram;
  provider: AnchorProvider;
  data: ClaimData;
  onAfterSignAction?: () => void;
}): Promise<SendTxResult> {
  const { program, provider, onAfterSignAction, data } = args;
  try {
      const ix = await buildClaimIx({ program, provider, data });
      const ixs = claimWithComputeBudget([ix]);
      return await sendAndConfirmTx({
        connection: sendConnection,
        provider,
        ixs,
        opts: { useV0: true, maxRetries: 3, skipPreflight: false },
        cb: {
          onAfterSign: () => onAfterSignAction?.(),
        },
      });
  } catch (e) {
    return { ok: false, reason: "FAILED", message: toErrMsg(e) };
  }
}