export const ALLOWED_RPC_METHODS = new Set([
  "getMinimumBalanceForRentExemption",
  "getBalance",
  "getBalanceAndContext",
  "getRecentPerformanceSamples",
  "getAccountInfo",
  "getMultipleAccounts",
  "getLatestBlockhash",
  "getEpochInfo",
  "getSlot",
  "getBlockHeight",
  "getProgramAccounts",
  "getSignaturesForAddress",
  "getTransaction",
  "sendTransaction",
  "simulateTransaction",
  "getSignatureStatuses",
  "getBlockTime",
]);

export function pickRpc(cluster: string | null) {
  const c =
    cluster === "mainnet" || cluster === "mainnet-beta" ? "mainnet" : "devnet";

  const url =
    c === "mainnet" ? process.env.MAINNET_RPC_URL : process.env.DEVNET_RPC_URL;

  return (
    url ??
    (c === "mainnet"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com")
  );
}