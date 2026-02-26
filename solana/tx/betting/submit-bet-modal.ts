import type { AnchorProvider } from "@coral-xyz/anchor";
import type { BetModalState } from "@/state/betting-atom";

import type { Ic42nProgram } from "@/solana/anchor-client";
import { buildPlacePredictionIx } from './build-place-prediction-ix';
import { buildAddLamportsIx } from "./build-add-lamports-ix";
import { withComputeBudget } from "@/solana/tx/tx-options";
import { sendAndConfirmTx, SendTxResult } from '@/solana/tx/send-transaction';
import { sendConnection } from "@/solana/tx/send-connection";
import { toErrMsg } from '@/utils/error';
import { buildChangeNumberIx } from '@/solana/tx/betting/build-change-number-ix';

export async function submitBetModalTx(args: {
  program: Ic42nProgram;
  provider: AnchorProvider;
  state: BetModalState;
  allowedNumbers: readonly number[];
  onAfterSignAction?: () => void;
}): Promise<SendTxResult> {
  const { program, provider, state, onAfterSignAction, allowedNumbers } = args;

  try {
    switch (state.mode) {
      case "new": {
        const ix = await buildPlacePredictionIx({ program, provider, state, allowedNumbers });
        const ixs = withComputeBudget([ix], state.mode);

        return await sendAndConfirmTx({
          connection: sendConnection,
          provider,
          ixs,
          opts: { useV0: true, maxRetries: 1, skipPreflight: false },
          cb: {
            onAfterSign: () => onAfterSignAction?.(),
          },
        });
      }

      case "addLamports": {
        const ix = await buildAddLamportsIx({ program, provider, state, allowedNumbers});
        const ixs = withComputeBudget([ix], state.mode);
        return await sendAndConfirmTx({
          connection: sendConnection,
          provider,
          ixs,
          opts: { useV0: true, maxRetries: 3, skipPreflight: false },
          cb: {
            onAfterSign: () => onAfterSignAction?.(),
          },
        });
      }

      case "changeNumber": {
        const ix = await buildChangeNumberIx({ program, provider, state, allowedNumbers });
        const ixs = withComputeBudget([ix], state.mode);
        return await sendAndConfirmTx({
          connection: sendConnection,
          provider,
          ixs,
          opts: { useV0: true, maxRetries: 3, skipPreflight: false },
          cb: {
            onAfterSign: () => onAfterSignAction?.(),
          },
        });
      }
    }
  } catch (e) {
    // no throw; convert unexpected builder errors into a FAILED result
    return { ok: false, reason: "FAILED", message: toErrMsg(e) };
  }
}