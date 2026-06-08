"use client";

/**
 * RoundCounter — game-like HUD element: "ROUND 2 / 5 — REBUTTAL" (docs/02).
 */

import { motion } from "framer-motion";

import { Badge } from "@/components/game/Badge";
import type { DebateMode } from "@/lib/debate/debateTypes";
import { useT } from "@/lib/i18n/LocaleProvider";

interface RoundCounterProps {
  roundNumber: number;
  totalRounds: number;
  roundLabel?: string;
  mode: DebateMode;
}

export function RoundCounter({
  roundNumber,
  totalRounds,
  roundLabel,
  mode,
}: RoundCounterProps) {
  const d = useT();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <motion.div
        key={roundNumber}
        initial={{ scale: 0.9, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="inline-flex items-center gap-1.5 rounded-btn border-3 border-ink bg-night px-2 py-0.5 font-mono text-xs font-bold text-arcade-yellow"
      >
        {d.debate.round.counter(Math.min(roundNumber, totalRounds), totalRounds)}
      </motion.div>
      {roundLabel ? (
        <Badge color="yellow" size="sm">
          {roundLabel}
        </Badge>
      ) : null}
      <Badge color={mode === "debate" ? "red" : "purple"} size="sm">
        {mode === "debate" ? d.debate.round.debate : d.debate.round.discussion}
      </Badge>
    </div>
  );
}
