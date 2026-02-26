"use client";

import { useEffect, useMemo } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { useConnection } from "@solana/wallet-adapter-react";
import { useSolana } from "@/solana/use-solana";
import { getConfigPda, getLiveFeedPda } from "@/solana/pdas";
import { IC42N_ACCOUNTS_CODER } from "@/solana/anchor-client";
import { mapConfigDecoded } from "@/solana/decode/config";
import { decodeLiveFeedFromData } from "@/solana/decode/live-feed";
import {
  bootstrapRefreshCounterAtom,
  globalBootAtom,
  epochAtom,
} from "@/state/global-atoms";
import { liveFeedAtom, liveFeedDecodedAtom } from "@/state/live-feed-atoms";
import { configAtom, configReadyAtom } from "@/state/config-atoms";
import { tierBootAtom } from "@/state/tier-atoms";
import { errorToMessage } from "@/utils/error";

function summarizeAccount(pubkey: string, info: { lamports: number; data: Uint8Array }) {
  return { pubkey, lamports: info.lamports, dataLen: info.data.length };
}

export function useBootstrap(opts?: { tier?: number }) {
  const tier = opts?.tier ?? 1;

  const { chainConfig } = useSolana();
  const rpcUrl = chainConfig.solanaRpcUrl;
  const { connection } = useConnection();

  const configPda = useMemo(() => getConfigPda(), []);
  const liveFeedPda = useMemo(() => getLiveFeedPda(tier), [tier]);

  const refreshCounter = useAtomValue(bootstrapRefreshCounterAtom);

  const setGlobalBoot = useSetAtom(globalBootAtom);
  const setTierBoot = useSetAtom(tierBootAtom);

  const setEpoch = useSetAtom(epochAtom);
  const setConfig = useSetAtom(configAtom);
  const setConfigReady = useSetAtom(configReadyAtom);

  const setLiveFeed = useSetAtom(liveFeedAtom);
  const setLiveFeedDecoded = useSetAtom(liveFeedDecodedAtom);

  useEffect(() => {
    let cancelled = false;

    async function runBoot() {
      try {
        setGlobalBoot({ status: "loading", message: "Loading epoch…" });
        setTierBoot({ status: "loading", message: `Loading tier ${tier}…` });

        // 1) Fetch epoch + BOTH PDAs in parallel (one PDA call)
        const [ei, infos] = await Promise.all([
          connection.getEpochInfo(),
          connection.getMultipleAccountsInfo([configPda, liveFeedPda]),
        ]);

        if (cancelled) return;

        setGlobalBoot({ status: "loading", message: "Decoding accounts…" });

        const [configInfo, liveFeedInfo] = infos;

        // --- Config decode (required)
        const configSummary = configInfo ? summarizeAccount(configPda.toBase58(), configInfo) : null;

        const configDecodedRaw = configInfo
          ? IC42N_ACCOUNTS_CODER.decode("Config", configInfo.data)
          : null;

        const configReadyLocal = configDecodedRaw ? mapConfigDecoded(configDecodedRaw) : null;

        if (!configReadyLocal) {
          setGlobalBoot({ status: "error", message: "Config account failed to decode." });
          setTierBoot({ status: "error", message: "Tier load blocked (config missing)." });
          return;
        }

        // --- LiveFeed decode (can be null, but usually required for UI)
        const liveFeedSummary = liveFeedInfo
          ? summarizeAccount(liveFeedPda.toBase58(), liveFeedInfo)
          : null;

        const liveFeedDecoded = liveFeedInfo
          ? decodeLiveFeedFromData(liveFeedInfo.data)
          : null;

        // 2) Derive epoch timing
        const epochStartSlot = ei.absoluteSlot - ei.slotIndex;
        const epochEndSlot = epochStartSlot + ei.slotsInEpoch - 1;
        const cutoffSlot = epochEndSlot - Number(configReadyLocal.betCutoffSlots);

        // 3) Commit state (single “atomic-ish” push)
        setEpoch({
          epoch: ei.epoch,
          slotIndex: ei.slotIndex,
          slotsInEpoch: ei.slotsInEpoch,
          absoluteSlot: ei.absoluteSlot,
          epochStartSlot,
          epochEndSlot,
          cutoffSlot,
        });

        setConfig(configSummary);
        setConfigReady(configReadyLocal);

        setLiveFeed(liveFeedSummary);
        setLiveFeedDecoded(liveFeedDecoded);

        setGlobalBoot({ status: "ready" });
        setTierBoot({ status: "ready", message: `Tier ${tier} ready` });
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = errorToMessage(e);
        setGlobalBoot({ status: "error", message: msg });
        setTierBoot({ status: "error", message: msg });
      }
    }

    void runBoot();
    return () => {
      cancelled = true;
    };
  }, [
    rpcUrl,
    refreshCounter,
    tier,
    connection,
    configPda,
    liveFeedPda,
    setGlobalBoot,
    setTierBoot,
    setEpoch,
    setConfig,
    setConfigReady,
    setLiveFeed,
    setLiveFeedDecoded,
  ]);
}