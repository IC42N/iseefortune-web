import { atom } from "jotai";
import { tierBootAtom } from "@/state/tier-atoms";

// Boot atoms are fine with an optional message.
// (Because "idle" and even "loading" often have no message yet.)
export type BootStatus =
  | { status: "idle"; message?: string }
  | { status: "loading"; message?: string }
  | { status: "ready"; message?: string }
  | { status: "error"; message: string };

export type AppBootStatus = "idle" | "loading" | "ready" | "error";
export type AppBoot = { status: AppBootStatus; progress: number; message: string };

export const globalBootAtom = atom<BootStatus>({ status: "idle" });

// (Optional) if you keep this, note: it only reflects *global* readiness.
// You’ll likely want appReady to reflect global+tier.
export const appReadyAtom = atom((get) => {
  const g = get(globalBootAtom).status === "ready";
  const t = get(tierBootAtom).status === "ready";
  return g && t;
});

export const appBootAtom = atom((get) => {
  const g = get(globalBootAtom);
  const t = get(tierBootAtom);

  if (g.status === "error") {
    return { status: "error", progress: 0, message: g.message } satisfies AppBoot;
  }
  if (t.status === "error") {
    return { status: "error", progress: 0, message: t.message ?? "Tier boot failed." } satisfies AppBoot;
  }

  if (g.status === "ready" && t.status === "ready") {
    return { status: "ready", progress: 100, message: "Aligning Stars" } satisfies AppBoot;
  }

  const status: AppBootStatus =
    g.status === "idle" && t.status === "idle" ? "idle" : "loading";

  const base = g.status === "ready" ? 65 : g.status === "loading" ? 25 : 5;
  const tierPart = t.status === "ready" ? 30 : t.status === "loading" ? 15 : 0;

  const progress = Math.min(95, base + tierPart);

  const message =
    g.status !== "ready" ? (g.message ?? "Loading epoch…") :
      t.status !== "ready" ? (t.message ?? "Loading game feed…") :
        "Finalizing…";

  return { status, progress, message } satisfies AppBoot;
});


// Source of truth clock on the wall. Where the chain is right now.
export const epochAtom = atom<{
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  epochStartSlot: number;
  epochEndSlot:number;
  cutoffSlot:number;
} | null>(null);

// “Raw” summaries (useful for quick UI + sanity checks)
// export const treasuryAtom = atom<{ pubkey: string; lamports: number; dataLen: number } | null>(null);
// export const treasuryDecodedAtom = atom<unknown | null>(null);


// Increment this to force useBootstrap() to rerun globals + tier loads
export const bootstrapRefreshCounterAtom = atom(0);

export const requestBootstrapRefreshAtom = atom(null, (get, set) => {
  set(bootstrapRefreshCounterAtom, get(bootstrapRefreshCounterAtom) + 1);
});