"use client";

/**
 * BlitzStage — the cinematic Blitz view, shot like the "objection" meme: the
 * camera CUTS to whoever is speaking (one fighter fills the screen), a white
 * flash sells each cut, the screen shakes on a move, and the verdict is revealed
 * in-scene. No video — just full-screen character shots + camera direction.
 * Reduced motion collapses to a static shot + captioned text (via the runner +
 * BlitzTranscript).
 */

import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { useArena } from "@/lib/state/ArenaContext";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import { useBlitzRunner } from "@/lib/debate/useBlitzRunner";
import { BLITZ_BUFFER } from "@/lib/debate/blitzBuffer";
import type { BlitzPose } from "@/lib/debate/blitzCharacters";
import { CharacterShot } from "@/components/blitz/CharacterShot";
import { SpeedLines } from "@/components/blitz/SpeedLines";
import { DialogueBox } from "@/components/blitz/DialogueBox";
import { MoveSplash } from "@/components/blitz/MoveSplash";
import { VerdictReveal } from "@/components/blitz/VerdictReveal";
import { BlitzTranscript } from "@/components/blitz/BlitzTranscript";
import { getModelById } from "@/lib/models/modelRegistry";

export function BlitzStage({ session }: { session: DebateSession }) {
  const { updateSession } = useArena();
  const reduce = useReduceMotion();
  // Blitz is 1v1 → battle index 0. Persist to ArenaContext so /result + history
  // + share see the finished match.
  const onPersist = useCallback((next: DebateSession) => updateSession(0, next), [updateSession]);
  const r = useBlitzRunner(session, { onPersist });

  const activeModel =
    r.speaker === "modelA" ? session.modelA : r.speaker === "modelB" ? session.modelB : null;
  const activeSide: "A" | "B" = r.speaker === "modelB" ? "B" : "A";
  const speakerName = activeModel?.displayName ?? "";
  const pose: BlitzPose = r.phase === "moveSplash" ? "attack" : "talk";
  // A stable per-turn key so a NEW turn remounts the shot (→ hard cut + flash),
  // but the splash→speaking transition within one turn does not.
  const cutKey = `${r.speaker}-${r.messages.length}`;
  const inScene = (r.phase === "speaking" || r.phase === "moveSplash") && activeModel;

  return (
    <div className="relative flex min-h-[calc(100vh-60px)] w-full flex-col overflow-hidden">
      {/* Scene (shakes on a move landing). */}
      <motion.div
        animate={r.phase === "moveSplash" && !reduce ? { x: [0, -9, 8, -5, 4, 0], y: [0, 5, -4, 3, 0, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex flex-1 flex-col"
      >
        {/* Full-screen speaker shot */}
        <div className="relative flex flex-1 items-center justify-center">
          {inScene ? (
            <AnimatePresence mode="popLayout">
              <motion.div key={cutKey} className="absolute inset-0" exit={{ opacity: 0 }}>
                <CharacterShot
                  model={activeModel!}
                  side={activeSide}
                  pose={pose}
                  talking={r.phase === "speaking"}
                />
              </motion.div>
            </AnimatePresence>
          ) : r.phase === "intro" ? (
            <VsIntro session={session} buffered={Math.min(r.bufferedCount, BLITZ_BUFFER)} />
          ) : r.phase === "roundTitle" && r.roundLabel ? (
            <RoundTitle label={r.roundLabel} reduce={reduce} />
          ) : r.phase === "judging" ? (
            <div className="text-center font-display text-2xl text-ink" role="status">
              The judge is deciding…
            </div>
          ) : null}

          {/* Speed lines + move splash on a move cut-in */}
          <AnimatePresence>
            {r.phase === "moveSplash" && r.move ? <SpeedLines key="lines" /> : null}
          </AnimatePresence>
          <AnimatePresence>
            {r.phase === "moveSplash" && r.move && r.speaker ? (
              <MoveSplash key="splash" move={r.move} side={activeSide} />
            ) : null}
          </AnimatePresence>
        </div>

        {/* Dialogue box pinned to the bottom */}
        {inScene ? (
          <div className="px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="mx-auto max-w-3xl">
              <DialogueBox speakerName={speakerName} line={r.line} move={r.move} />
            </div>
          </div>
        ) : null}
      </motion.div>

      {r.phase === "error" ? (
        <div className="p-6 text-center text-arcade-red">
          Something went sideways.{" "}
          <button onClick={r.replay} className="underline">
            Try again
          </button>
        </div>
      ) : null}

      {/* Accessibility: SR live region + transcript toggle (always mounted). */}
      <div className="mx-auto w-full max-w-3xl px-3 pb-3">
        <BlitzTranscript session={session} messages={r.messages} verdict={r.verdict} />
      </div>

      {/* Verdict persists through the terminal `done` phase. */}
      {(r.phase === "verdict" || r.phase === "done") && r.verdict ? (
        <VerdictReveal session={session} verdict={r.verdict} onReplay={r.replay} />
      ) : null}
      {r.phase === "done" && !r.verdict ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-paper/95 p-6">
          <div className="rounded-panel border-4 border-ink bg-arcade-yellow px-8 py-4 font-display text-2xl text-night shadow-hard">
            Match over
          </div>
          <button onClick={r.replay} className="rounded-btn border-4 border-ink bg-arcade-green px-4 py-2 font-display text-night shadow-hard">
            Rematch
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RoundTitle({ label, reduce }: { label: string; reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { scale: 1.4, opacity: 0, rotate: -3 }}
      animate={reduce ? {} : { scale: 1, opacity: 1, rotate: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 16 }}
      className="rounded-panel border-4 border-ink bg-arcade-yellow px-8 py-4 font-display text-3xl text-night shadow-hard sm:text-5xl"
    >
      {label}
    </motion.div>
  );
}

function VsIntro({ session, buffered }: { session: DebateSession; buffered: number }) {
  const a = getModelById(session.modelA.modelId)?.avatar ?? "🤖";
  const b = getModelById(session.modelB.modelId)?.avatar ?? "🤖";
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6 sm:gap-10">
        <div className="grid h-28 w-28 place-items-center rounded-modal border-4 border-ink border-l-8 border-l-arcade-blue bg-card text-6xl shadow-hard sm:h-36 sm:w-36 sm:text-7xl" aria-hidden>
          {a}
        </div>
        <div className="font-display text-4xl text-ink sm:text-6xl">VS</div>
        <div className="grid h-28 w-28 place-items-center rounded-modal border-4 border-ink border-r-8 border-r-arcade-red bg-card text-6xl shadow-hard sm:h-36 sm:w-36 sm:text-7xl" aria-hidden>
          {b}
        </div>
      </div>
      <div className="text-center font-display text-lg text-ink" role="status">
        Fighters entering the arena… ({buffered}/{BLITZ_BUFFER})
      </div>
    </div>
  );
}
