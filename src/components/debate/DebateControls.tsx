"use client";

/**
 * DebateControls — stop / rematch / new setup / results. Sticky at the bottom on
 * mobile so the primary action is always reachable (docs/09 mobile UX).
 */

import { memo } from "react";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import type { AwaitingKind, RunnerPhase } from "@/lib/debate/useDebateRunner";
import { useT } from "@/lib/i18n/LocaleProvider";

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
  const d = useT();
  const running = phase === "thinking" || phase === "streaming" || phase === "judging";

  return (
    // py-2 + sm Stop buttons: the bar is a safety control, not a hero — keep it
    // shallow so it steals as little arena space as possible (owner feedback).
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t-4 border-ink bg-paper/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-card sm:border-4">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        {phase === "awaiting" ? (
          <>
            <ArcadeButton variant="danger-red" size="sm" onClick={onStop} leftIcon={<span aria-hidden>⏹</span>}>
              {d.debate.controls.stop}
            </ArcadeButton>
            <ArcadeButton variant="primary-green" size="lg" onClick={onNext}>
              {awaitingKind === "verdict" ? d.debate.controls.revealVerdict : d.debate.controls.nextTurn}
            </ArcadeButton>
          </>
        ) : running ? (
          <ArcadeButton variant="danger-red" size="sm" onClick={onStop} leftIcon={<span aria-hidden>⏹</span>}>
            {d.debate.controls.stopMatch}
          </ArcadeButton>
        ) : phase === "error" ? (
          <>
            <ArcadeButton variant="neutral-white" onClick={onNewSetup}>
              {d.debate.controls.newSetup}
            </ArcadeButton>
            <ArcadeButton variant="primary-green" onClick={onRetry} leftIcon={<span aria-hidden>↻</span>}>
              {d.debate.controls.retryTurn}
            </ArcadeButton>
          </>
        ) : (
          <>
            <ArcadeButton variant="neutral-white" onClick={onNewSetup}>
              {d.debate.controls.newSetup}
            </ArcadeButton>
            <ArcadeButton variant="primary-yellow" onClick={onRestart}>
              {d.debate.controls.rematch}
            </ArcadeButton>
            <ArcadeButton
              variant="primary-green"
              onClick={onResults}
              disabled={!hasMessages}
            >
              {d.debate.controls.seeResults}
            </ArcadeButton>
          </>
        )}
      </div>
    </div>
  );
}

export const DebateControls = memo(DebateControlsComponent);
