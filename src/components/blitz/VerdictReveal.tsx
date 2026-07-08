"use client";

/**
 * VerdictReveal — the in-scene verdict. The existing judge decides the winner;
 * Blitz just reveals it dramatically on the stage (spring pop → winner banner)
 * instead of jumping to the results card. Reduced motion renders it static.
 */

import { motion } from "framer-motion";
import Link from "next/link";
import type { DebateSession, DebateVerdict } from "@/lib/debate/debateTypes";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";

export function VerdictReveal({
  session,
  verdict,
  onReplay,
}: {
  session: DebateSession;
  verdict: DebateVerdict;
  onReplay: () => void;
}) {
  const reduce = useReduceMotion();
  const winnerLine =
    verdict.winner === "modelA"
      ? `${session.modelA.displayName} takes it!`
      : verdict.winner === "modelB"
        ? `${session.modelB.displayName} takes it!`
        : verdict.winner === "tie"
          ? "It's a draw!"
          : "Match over";

  const banner = (
    <div className="rounded-panel border-4 border-ink bg-arcade-yellow px-6 py-3 text-center font-display text-2xl text-night shadow-hard sm:px-8 sm:py-4 sm:text-3xl">
      {winnerLine}
    </div>
  );

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-paper/95 p-6">
      {reduce ? (
        banner
      ) : (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          {banner}
        </motion.div>
      )}
      {verdict.summary ? (
        <p className="max-w-md text-center text-ink">{verdict.summary}</p>
      ) : null}
      <div className="flex gap-3">
        <button
          onClick={onReplay}
          className="rounded-btn border-4 border-ink bg-arcade-green px-4 py-2 font-display text-night shadow-hard transition-transform active:translate-y-0.5"
        >
          Rematch
        </button>
        <Link
          href="/result"
          className="rounded-btn border-4 border-ink bg-card px-4 py-2 font-display text-ink shadow-hard"
        >
          Full result
        </Link>
      </div>
    </div>
  );
}
