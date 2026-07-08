"use client";

/**
 * MoveSplash — the full-frame "OBJECTION!" style overlay. Slams in with a scale
 * overshoot + slight rotation; on reduced motion it renders statically (no
 * transition), keeping the drama accessible.
 */

import { motion } from "framer-motion";
import type { BlitzMove } from "@/lib/debate/debateTypes";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";

const COLOR: Record<BlitzMove, string> = {
  OBJECTION: "bg-arcade-red text-white",
  COUNTER: "bg-arcade-blue text-white",
  RECEIPTS: "bg-arcade-yellow text-night",
  TOUCHE: "bg-surface text-ink",
  FINISHER: "bg-arcade-red text-white",
};

export function MoveSplash({ move, side }: { move: BlitzMove; side: "A" | "B" }) {
  const reduce = useReduceMotion();
  const box = `rounded-btn border-4 border-ink px-6 py-2.5 font-display text-3xl shadow-hard sm:px-8 sm:py-3 sm:text-4xl ${COLOR[move]}`;

  if (reduce) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className={box}>{move}!</div>
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.2, rotate: side === "A" ? -8 : 8, opacity: 0 }}
        animate={{ scale: [0.2, 1.15, 1], rotate: side === "A" ? -6 : 6, opacity: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={box}
      >
        {move}!
      </motion.div>
    </div>
  );
}
