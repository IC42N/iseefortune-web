import { ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
import { BetModalState } from '@/state/betting-atom';

export function withComputeBudget(ixs: TransactionInstruction[], mode: BetModalState["mode"]) {
  const cuLimit =
    mode === "new" ? 220_000 :
      mode === "addLamports" ? 200_000 :
        220_000;

  // start conservative; you can tune this later or make it dynamic
  const cuPriceMicroLamports =
    mode === "new" ? 2_000 : 1_000; // 0.002–0.001 lamports/CU

  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPriceMicroLamports }),
    ...ixs,
  ];
}

export function claimWithComputeBudget(ixs: TransactionInstruction[]) {
  const cuLimit = 200_000;
  const cuPriceMicroLamports = 2_000;
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPriceMicroLamports }),
    ...ixs,
  ];
}