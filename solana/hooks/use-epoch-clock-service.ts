"use client";

import { useEffect, useMemo, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAtomValue, useSetAtom } from "jotai";

import { appReadyAtom, epochAtom } from "@/state/global-atoms";
import {
  epochClockAtom,
  epochMarkersFiredAtom,
  epochNoticesAtom,
  epochResultsModalAtom,
  type EpochPhase, EpochClock
} from '@/state/epoch-clock-atoms';

const FALLBACK_SLOT_TIME_SEC = 0.4;

// Throttle how often we COMMIT to atoms (not how often slots arrive)
const CLOCK_COMMIT_INTERVAL_MS = 500;

// Skip clock commits unless a "meaningful" change
const MIN_PROGRESS_DELTA = 0.002; // ~0.2%
const MIN_REMAINING_SEC_DELTA = 1; // 1 second

function computePhase(remainingSec: number | null, progress: number): EpochPhase {
  if (remainingSec != null && remainingSec <= 0) return "resolving";
  if (remainingSec != null && remainingSec <= 60 * 60) return "lastHour";
  if (progress >= 0.92) return "locked";
  if (progress >= 0.75) return "late";
  if (progress >= 0.35) return "mid";
  return "early";
}

/** Opinion: keep colors discrete per phase; gradients look cool but phases feel “game-y”. */
function phaseColor(phase: EpochPhase): string {
  switch (phase) {
    case "early":
      return "#7FB069";
    case "mid":
      return "#7FB069";
    case "late":
      return "#D4B36A";
    case "lastHour":
      return "#E04F5F";
    case "locked":
      return "#E38B2C";
    case "resolving":
      return "#B9B9B9";
    case "post":
      return "#7FB069";
  }
}

type Notice = { id: string; text: string; ts: number };

function fireNoticeOnce(
  key: string,
  text: string,
  markersRef: { current: Set<string> },
  setMarkers: (fn: (prev: Set<string>) => Set<string>) => void,
  pushNotice: (n: Notice) => void
) {
  if (markersRef.current.has(key)) return;

  // Use functional update so we NEVER rely on captured markers.
  setMarkers((prev) => {
    if (prev.has(key)) return prev;
    const next = new Set(prev);
    next.add(key);
    markersRef.current = next; // keep ref in sync
    return next;
  });

  pushNotice({ id: key, text, ts: Date.now() });
}

export function useEpochClockService() {
  const appReady = useAtomValue(appReadyAtom);
  const epoch = useAtomValue(epochAtom);
  const { connection } = useConnection();

  const setClock = useSetAtom(epochClockAtom);
  const setModal = useSetAtom(epochResultsModalAtom);

  const setNotices = useSetAtom(epochNoticesAtom);
  const setMarkers = useSetAtom(epochMarkersFiredAtom);
  const markers = useAtomValue(epochMarkersFiredAtom);

  const slotTimeSecRef = useRef<number>(FALLBACK_SLOT_TIME_SEC);

  // Prevent resubscribe churn: mirror markers into a ref.
  const markersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  // Throttle commit timing
  const lastCommitMsRef = useRef<number>(0);

  // Compute end slot from epoch snapshot
  const endSlot = useMemo(() => {
    if (!epoch) return null;
    const remaining = Math.max(0, epoch.slotsInEpoch - epoch.slotIndex);
    return epoch.absoluteSlot + remaining;
  }, [epoch]);

  // Slot-time sampler (every 30s)
  useEffect(() => {
    if (!appReady) return;

    let cancelled = false;

    async function sample() {
      try {
        const samples = await connection.getRecentPerformanceSamples(1);
        const s = samples?.[0];
        if (!s) return;

        const est = s.samplePeriodSecs / Math.max(1, s.numSlots);
        if (!cancelled && Number.isFinite(est) && est > 0) {
          slotTimeSecRef.current = est;
        }
      } catch {
        // ignore
      }
    }

    void sample();
    const id = window.setInterval(sample, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [appReady, connection]);

  // Slot subscription => update clock atom (throttled + deduped)
  useEffect(() => {
    if (!appReady || !epoch || endSlot == null) return;

    let cancelled = false;
    let subId: number | null = null;

    const maybeCommitClock = (nextClock: EpochClock) => {
      const now = performance.now();

      // Throttle commits (keeps UX live without re-rendering ~every slot)
      if (now - lastCommitMsRef.current < CLOCK_COMMIT_INTERVAL_MS) return;

      setClock((prev) => {
        // If nothing to compare against, commit immediately
        if (!prev) {
          lastCommitMsRef.current = now;
          return nextClock;
        }

        const prevRemainingSec = prev.remainingSec ?? null;
        const nextRemainingSec = nextClock.remainingSec ?? null;

        const phaseChanged = prev.phase !== nextClock.phase;

        const remainingSecChanged =
          prevRemainingSec == null || nextRemainingSec == null
            ? prevRemainingSec !== nextRemainingSec
            : Math.abs(prevRemainingSec - nextRemainingSec) >= MIN_REMAINING_SEC_DELTA;

        const progressChanged =
          Math.abs((prev.progress ?? 0) - (nextClock.progress ?? 0)) >= MIN_PROGRESS_DELTA;

        const remainingSlotsChanged = prev.remainingSlots !== nextClock.remainingSlots;

        // Meaningful change heuristic:
        if (!phaseChanged && !remainingSecChanged && !progressChanged && !remainingSlotsChanged) {
          return prev;
        }

        lastCommitMsRef.current = now;
        return nextClock;
      });
    };

    const update = (currentSlot: number) => {
      if (cancelled) return;

      const remainingSlots = Math.max(0, endSlot - currentSlot);
      const est = slotTimeSecRef.current ?? FALLBACK_SLOT_TIME_SEC;
      const remainingSec = remainingSlots * est;

      const elapsedSlots = Math.max(0, epoch.slotsInEpoch - remainingSlots);
      const progress = epoch.slotsInEpoch > 0 ? elapsedSlots / epoch.slotsInEpoch : 0;

      const phase = computePhase(Number.isFinite(remainingSec) ? remainingSec : null, progress);
      const color = phaseColor(phase);

      const nextClock = {
        epoch: epoch.epoch,
        absoluteSlot: epoch.absoluteSlot,
        slotsInEpoch: epoch.slotsInEpoch,
        endSlot,
        remainingSlots,
        remainingSec: Number.isFinite(remainingSec) ? remainingSec : null,
        progress,
        phase,
        color,
      };

      maybeCommitClock(nextClock);

      // ---- markers / notices (deduped via markersRef) ----
      const pushNotice = (n: Notice) =>
        setNotices((prev) => [n, ...prev].slice(0, 50)); // keep bounded

      if (progress >= 0.25)
        fireNoticeOnce("p25", "25% of the epoch has passed.", markersRef, setMarkers, pushNotice);
      if (progress >= 0.5)
        fireNoticeOnce("p50", "Halfway through the epoch.", markersRef, setMarkers, pushNotice);
      if (progress >= 0.75)
        fireNoticeOnce(
          "p75",
          "75% complete — things are heating up.",
          markersRef,
          setMarkers,
          pushNotice
        );

      if (progress >= 0.92) {
        fireNoticeOnce("locked", "Betting is now locked.", markersRef, setMarkers, pushNotice);
      }

      // ---- epoch end => resolving overlay + results modal trigger ----
      if (remainingSlots === 0) {
        fireNoticeOnce(
          "end",
          "Epoch ended — resolving the game now…",
          markersRef,
          setMarkers,
          pushNotice
        );

        if (!markersRef.current.has("modal-open")) {
          // Open immediately (processing UI shows while waiting for resolved PDA)
          fireNoticeOnce(
            "modal-open",
            "Finalizing results…",
            markersRef,
            setMarkers,
            pushNotice
          );
          setModal(prev => {
            if (prev.open) return prev;      // don’t retarget if already open
            return { open: true, epoch: epoch.epoch };
          });
        }
      }
    };

    // init
    update(epoch.absoluteSlot);

    // live updates (WS)
    subId = connection.onSlotChange((info) => update(info.slot));

    return () => {
      cancelled = true;
      if (subId != null) void connection.removeSlotChangeListener(subId);
    };
    // IMPORTANT: markers removed from deps (we use markersRef instead)
  }, [appReady, epoch, endSlot, connection, setClock, setNotices, setMarkers, setModal]);
}