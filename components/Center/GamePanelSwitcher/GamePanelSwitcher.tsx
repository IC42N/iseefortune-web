"use client";

import { useAtomValue } from "jotai";
import { selectedEpochAtom } from '@/state/selected-epoch-history-atoms';
import CurrentGamePanel from '@/components/Center/CurrentGamePanel/CurrentGamePanel';
import { PastGameResults } from '@/components/Center/PastGameResults/PastGameResults';


export function GamePanelSwitcher() {

  const selected = useAtomValue(selectedEpochAtom);

  return (
    <div className="gps-root">
      <div
        key={selected.kind === "current" ? "current" : `epoch-${selected.epoch}`}
        className="gps-panel"
      >
        {selected.kind === "current" ? (
          <CurrentGamePanel />
        ) : (
          <PastGameResults />
        )}
      </div>

      <style jsx>{`
        .gps-root {
          position: relative;
          min-height: 420px;
            height: 100%;
        }
        .gps-panel {
          animation: fadeIn 180ms ease both;
            height: 100%;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0px);
          }
        }
      `}</style>
    </div>
  );
}



