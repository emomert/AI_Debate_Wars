"use client";

/**
 * SpeedLines — the comic "impact" streaks behind a character on a move cut-in.
 * Pure CSS radial burst; hidden entirely under reduced motion.
 */

import { motion } from "framer-motion";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";

export function SpeedLines() {
  const reduce = useReduceMotion();
  if (reduce) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: [0, 0.5, 0.35], scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        background:
          "repeating-conic-gradient(from 0deg at 50% 50%, rgba(5,5,5,0.16) 0deg 2deg, transparent 2deg 8deg)",
        maskImage: "radial-gradient(circle at 50% 50%, transparent 30%, black 62%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 30%, black 62%)",
      }}
    />
  );
}
