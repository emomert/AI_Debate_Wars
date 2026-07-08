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
      {r.phase === "verdict" && r.verdict ? (
        <VerdictReveal session={session} verdict={r.verdict} onReplay={r.replay} />
      ) : null}
    </div>
  );
}
