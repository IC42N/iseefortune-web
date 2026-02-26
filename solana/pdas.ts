import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./anchor-client";
import { BN } from '@coral-xyz/anchor';

// Config PDA
export function getConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  return pda;
}

// LiveFeed PDA (per tier)
export function getLiveFeedPda(tier: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("live_feed"), Buffer.from([tier])],
    PROGRAM_ID
  );
  return pda;
}

// Treasury
export function getTreasuryPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], PROGRAM_ID);
  return pda;
}


export function getBetPda(player: PublicKey,firstEpochInChain: bigint, tierId: number): PublicKey {
  const firstEpochInChainBn = new BN(firstEpochInChain);
  const firstEpochInChainLe8 = firstEpochInChainBn.toArrayLike(Buffer, "le", 8);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("bet"),
      player.toBuffer(),
      firstEpochInChainLe8,
      Buffer.from([tierId]),
    ],
    PROGRAM_ID
  );
  return pda;
}

export function getPredictionPda(player: PublicKey,firstEpochInChain: bigint, tierId: number): PublicKey {
  const firstEpochInChainBn = new BN(firstEpochInChain);
  const firstEpochInChainLe8 = firstEpochInChainBn.toArrayLike(Buffer, "le", 8);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("prediction"),
      player.toBuffer(),
      firstEpochInChainLe8,
      Buffer.from([tierId]),
    ],
    PROGRAM_ID
  );
  return pda;
}



export function getProfilePda(player: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), player.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// Not first epoch on chain. It is the epoch that is was resolving in.
export function getResolvedGamePda(epoch: bigint, tier: number){
  const epochBN = new BN(epoch);
  const epochLe8 = epochBN.toArrayLike(Buffer, "le", 8);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("resolved_game"),
      epochLe8,
      Buffer.from([tier])
    ],
    PROGRAM_ID
  );
  return pda;
}
