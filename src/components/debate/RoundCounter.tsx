"use client";

/**
 * RoundCounter — game-like HUD element: "ROUND 2 / 5" (docs/02). Deliberately
 * just the round pill: the mode / round-title / phase chips that used to ride
 * along were removed in the July 2026 arena declutter.
 */

import { motion } from "framer-motion";

import { useT } from "@/lib/i18n/LocaleProvider";

interface RoundCounterProps {
  roundNumber: number;
  totalRounds: number;
}

export function RoundCounter({ roundNumber, totalRounds }: RoundCounterProps) {
  const d = useT();
  return (
    <motion.div
      key={roundNumber}
      initial={{ scale: 0.9, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="inline-flex items-center gap-1.5 rounded-btn border-3 border-ink bg-night px-2 py-0.5 font-mono text-xs font-bold text-arcade-yellow"
    >
      {d.debate.round.counter(Math.min(roundNumber, totalRounds), totalRounds)}
    </motion.div>
  );
}
