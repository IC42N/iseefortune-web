import "server-only";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import IDL_JSON from "@/solana/anchor/idl/ic42n.json";

export const IC42N_IDL = IDL_JSON as unknown as Idl;
export const IC42N_ACCOUNTS_CODER = new BorshAccountsCoder(IC42N_IDL);