"use client";

import { useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAtomValue } from "jotai";
import type { ExtractAtomValue } from "jotai";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";

import type { ChainId } from "./chain-context";
import { chainConfigAtom } from "./chain-context";
import { useSelectedWalletAccount } from "./selected-wallet-account-jotai";

export type SolanaState = {
    walletName: WalletName | null;
    publicKey: PublicKey | null;
    isConnected: boolean;
    chain: ChainId;
    chainConfig: ExtractAtomValue<typeof chainConfigAtom>;
    rpcUrl: string;
    setSelectedWalletName: (name: WalletName | null) => void;
    clearSelectedWallet: () => void;
};

export function useSolana(): SolanaState {
    const chainConfig = useAtomValue(chainConfigAtom);
    const rpcUrl = String(chainConfig.solanaRpcUrl);

    const { wallet, publicKey, connected } = useWallet();
    const walletName = wallet?.adapter?.name ?? null;

    const {
        walletName: persistedName,
        publicKey: persistedPk,
        setSelectedWallet,
        setSelectedPublicKey,
        clearSelection,
    } = useSelectedWalletAccount();

    // persist on connect
    useEffect(() => {
        if (!connected || !publicKey) return;
        if (walletName) setSelectedWallet(walletName);
        setSelectedPublicKey(publicKey);
    }, [connected, publicKey, walletName, setSelectedWallet, setSelectedPublicKey]);

    // clear on disconnect (only if we had something persisted)
    useEffect(() => {
        if (connected) return;
        if (!persistedName && !persistedPk) return;
        clearSelection();
    }, [connected, persistedName, persistedPk, clearSelection]);

    return {
        walletName,
        publicKey: publicKey ?? null,
        isConnected: Boolean(connected && publicKey),

        chain: chainConfig.chain,
        chainConfig,
        rpcUrl,

        setSelectedWalletName: (name) => setSelectedWallet(name),
        clearSelectedWallet: () => clearSelection(),
    };
}