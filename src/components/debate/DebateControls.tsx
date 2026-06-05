"use client";

/**
 * DebateControls — stop / rematch / new setup / results. Sticky at the bottom on
 * mobile so the primary action is always reachable (docs/09 mobile UX).
 */

import { memo } from "react";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import type { AwaitingKind, RunnerPhase } from "@/lib/debate/useDebateRunner";

interface DebateControlsProps {
  phase: RunnerPhase;
  awaitingKind: AwaitingKind | null;
  hasMessages: boolean;
  onStop: () => void;
  onRestart: () => void;
  onNewSetup: () => void;
  onResults: () => void;
  onRetry: () => void;
  onNext: () => void;
}

function DebateControlsComponent({
  phase,
  awaitingKind,
  hasMessages,
  onStop,
  onRestart,
  onNewSetup,
  onResults,
  onRetry,
  onNext,
}: DebateControlsProps) {
  const running = phase === "thinking" || phase === "streaming" || phase === "judging";

  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t-4 border-ink bg-paper/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border-4">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        {phase === "awaiting" ? (
          <>
            <ArcadeButton variant="danger-red" onClick={onStop} leftIcon={<span aria-hidden>⏹</span>}>
              Stop
            </ArcadeButton>
            <ArcadeButton variant="primary-green" size="lg" onClick={onNext}>
              {awaitingKind === "verdict" ? "🏆 Reveal the Verdict" : "▶ Next Turn"}
            </ArcadeButton>
          </>
        ) : running ? (
          <ArcadeButton variant="danger-red" onClick={onStop} leftIcon={<span aria-hidden>⏹</span>}>
            Stop Match
          </ArcadeButton>
        ) : phase === "error" ? (
          <>
            <ArcadeButton variant="neutral-white" onClick={onNewSetup}>
              ⚙️ New Setup
            </ArcadeButton>
            <ArcadeButton variant="primary-green" onClick={onRetry} leftIcon={<span aria-hidden>↻</span>}>
              Retry Turn
            </ArcadeButton>
          </>
        ) : (
          <>
            <ArcadeButton variant="neutral-white" onClick={onNewSetup}>
              ⚙️ New Setup
            </ArcadeButton>
            <ArcadeButton variant="primary-yellow" onClick={onRestart}>
              🔁 Rematch
            </ArcadeButton>
            <ArcadeButton
              variant="primary-green"
              onClick={onResults}
              disabled={!hasMessages}
            >
              📊 See Results
            </ArcadeButton>
          </>
        )}
      </div>
    </div>
  );
}

export const DebateControls = memo(DebateControlsComponent);
