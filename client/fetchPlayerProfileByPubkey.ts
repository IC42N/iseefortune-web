// "use client";
//
// import { decodePlayerProfile } from "@/solana/decode/player-profile";
// import { derivePlayerProfilePda } from "@/solana/profile";
// import { Connection, PublicKey } from "@solana/web3.js";
// import { PlayerProfileReady } from "@/state/player-profile-atoms";
//
// export async function fetchPlayerProfileByPubkey(
//   connection: Connection,
//   pubkey: PublicKey
// ): Promise<PlayerProfileReady | null> {
//   const profilePda = derivePlayerProfilePda(pubkey);
//
//   try {
//     const info = await connection.getAccountInfo(profilePda, {
//       commitment: "confirmed",
//     });
//
//     if (!info?.data) return null;
//     return decodePlayerProfile(profilePda, info.data);
//   } catch (e) {
//     console.warn("profile load failed", e);
//     return null;
//   }
// }