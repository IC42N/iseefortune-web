"use client";

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ChainId = "solana:devnet" | "solana:mainnet";
export type ExplorerCluster = "devnet" | "mainnet-beta";
export type Cluster = "mainnet" | "mainnet-beta" | "devnet";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type ChainContextValue = Readonly<{
  chain: ChainId;
  displayName: string;
  setChain(chain: ChainId): void;
  solanaExplorerClusterName: ExplorerCluster;
  solanaRpcUrl: string;
  solanaWsUrl?: string;
  fallbackRpcUrl?: string;
}>;

export const CHAIN_CONFIGS: Record<
  ChainId,
  Omit<ChainContextValue, "chain" | "setChain">
> = {
  "solana:devnet": {
    displayName: "Devnet",
    solanaExplorerClusterName: "devnet",
    solanaRpcUrl: `${SITE_URL}/api/rpc?cluster=devnet`,
    solanaWsUrl: process.env.NEXT_PUBLIC_SOLANA_WSS_DEVNET,
    fallbackRpcUrl: "https://api.devnet.solana.com",
  },
  "solana:mainnet": {
    displayName: "Mainnet Beta",
    solanaExplorerClusterName: "mainnet-beta",
    solanaRpcUrl: `${SITE_URL}/api/rpc?cluster=mainnet`,
    solanaWsUrl: process.env.NEXT_PUBLIC_SOLANA_WSS_MAINNET,
    fallbackRpcUrl: "https://api.mainnet-beta.solana.com",
  },
};

const STORAGE_KEY = "ic42n:selected-chain";

export const selectedChainIdAtom = atomWithStorage<ChainId>(
  STORAGE_KEY,
  "solana:mainnet"
);

export const chainConfigAtom = atom((get) => {
  const chainId = get(selectedChainIdAtom);
  const base = CHAIN_CONFIGS[chainId];
  return { chain: chainId, ...base } as const;
});

