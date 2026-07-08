"use client";

/**
 * BlitzStage — the Blitz-mode view. A persistent animated "stage": two fighter
 * panels, a round-title card, a bottom dialogue box (one line at a time), full-
 * frame move splashes, and an in-scene verdict. Reduced motion collapses to
 * captioned text via the runner + BlitzTranscript.
 */

import { useCallback } from "react";
import { AnimatePresence } from "framer-motion";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { useArena } from "@/lib/state/ArenaContext";
import { useBlitzRunner } from "@/lib/debate/useBlitzRunner";
import { BLITZ_BUFFER } from "@/lib/debate/blitzBuffer";
import { FighterPanel, type FighterPose } from "@/components/blitz/FighterPanel";
import { DialogueBox } from "@/components/blitz/DialogueBox";
import { MoveSplash } from "@/components/blitz/MoveSplash";
import { VerdictReveal } from "@/components/blitz/VerdictReveal";
import { BlitzTranscript } from "@/components/blitz/BlitzTranscript";

export function BlitzStage({ session }: { session: DebateSession }) {
  const { updateSession } = useArena();
  // Blitz is 1v1 → battle index 0. Persist to ArenaContext so /result + history
  // + share see the finished match.
  const onPersist = useCallback(
    (next: DebateSession) => updateSession(0, next),
    [updateSession],
  );
  const r = useBlitzRunner(session, { onPersist });

  const speakerName =
    r.speaker === "modelA"
      ? session.modelA.displayName
      : r.speaker === "modelB"
        ? session.modelB.displayName
        : "";
  const poseA: FighterPose = r.speaker === "modelA" ? "attack" : "idle";
  const poseB: FighterPose = r.speaker === "modelB" ? "attack" : "idle";

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-between gap-6 overflow-hidden p-4">
      {/* Fighters */}
      <div className="flex items-start justify-between gap-4">
        <FighterPanel model={session.modelA} side="A" active={r.speaker === "modelA"} pose={poseA} />
        <div className="self-center font-display text-2xl text-ink">VS</div>
        <FighterPanel model={session.modelB} side="B" active={r.speaker === "modelB"} pose={poseB} />
      </div>

      {/* Center: intro / round title */}
      <div className="flex flex-1 items-center justify-center">
        {r.phase === "intro" ? (
          <div className="text-center font-display text-lg text-ink" role="status">
            Fighters entering the arena… ({Math.min(r.bufferedCount, BLITZ_BUFFER)}/{BLITZ_BUFFER})
          </div>
        ) : r.phase === "roundTitle" && r.roundLabel ? (
          <div className="text-center font-display text-2xl text-ink sm:text-3xl">{r.roundLabel}</div>
        ) : r.phase === "judging" ? (
          <div className="text-center font-display text-xl text-ink" role="status">
            The judge is deciding…
          </div>
        ) : null}
      </div>

      {/* Bottom: current line */}
      {r.phase === "speaking" || r.phase === "moveSplash" ? (
        <DialogueBox speakerName={speakerName} line={r.line} move={r.move} />
      ) : null}

      {r.phase === "error" ? (
        <div className="text-center text-arcade-red">
          Something went sideways.{" "}
          <button onClick={r.replay} className="underline">
            Try again
          </button>
        </div>
      ) : null}

      <BlitzTranscript session={session} messages={r.messages} verdict={r.verdict} />

      {/* Overlays */}
      <AnimatePresence>
        {r.phase === "moveSplash" && r.move && r.speaker ? (
          <MoveSplash key="splash" move={r.move} side={r.speaker === "modelA" ? "A" : "B"} />
        ) : null}
      </AnimatePresence>
      {/* The verdict stays on screen through the terminal `done` phase (not just
          the brief `verdict` beat), so the winner + CTAs don't vanish. */}
      {(r.phase === "verdict" || r.phase === "done") && r.verdict ? (
        <VerdictReveal session={session} verdict={r.verdict} onReplay={r.replay} />
      ) : null}

      {/* No-judge matches still get an end state with a way out. */}
      {r.phase === "done" && !r.verdict ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-paper/95 p-6">
          <div className="rounded-panel border-4 border-ink bg-arcade-yellow px-8 py-4 font-display text-2xl text-night shadow-hard">
            Match over
          </div>
          <button
            onClick={r.replay}
            className="rounded-btn border-4 border-ink bg-arcade-green px-4 py-2 font-display text-night shadow-hard"
          >
            Rematch
          </button>
        </div>
      ) : null}
    </div>
  );
}
