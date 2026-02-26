"use client";

import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";

import { useAtomValue } from "jotai";
import { chainConfigAtom } from "@/solana/chain-context";
import { WalletSync } from '@/solana/wallet-sync';
import { WalletDisconnectedError } from '@solana/wallet-adapter-base';

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const chainConfig = useAtomValue(chainConfigAtom);

  const wallets = useMemo(() => {
    const list = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      // Jupiter: only add if you have a specific adapter for it
    ];

    // safety dedupe by adapter name (prevents key collisions)
    const seen = new Set<string>();
    return list.filter((w) => {
      const name = w.name;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, []);

  if (!chainConfig.solanaRpcUrl.startsWith("http")) {
    throw new Error(`Invalid RPC endpoint: ${chainConfig.solanaRpcUrl}`);
  }

  return (
    <ConnectionProvider endpoint={chainConfig.solanaRpcUrl} config={{ wsEndpoint: chainConfig.solanaWsUrl }}>
      <WalletProvider wallets={wallets} autoConnect={true}
        onError={(e) => {
          // Wallets often emit this during account switching. It's noisy and not actionable.
          if (e instanceof WalletDisconnectedError) return;

          // Some wallets don’t preserve class identity after bundling, so also guard by name/message:
          const name = (e)?.name;
          const msg = String((e)?.message ?? "");
          if (name === "WalletDisconnectedError" || msg.includes("disconnected")) return;

          console.error("[wallet]", e);
        }}
      >
        <WalletModalProvider>
          <WalletSync />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}