"use client";

/**
 * Root template — remounts on every route change, giving each page a quick,
 * professional fade-in (the "smooth pass" between Home → Setup → Arena …).
 *
 * Opacity-only on purpose: a transform here would turn this wrapper into a
 * containing block and break the sticky header / fixed overlays inside
 * GameShell. Honors reduce-motion (renders instantly).
 */

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useReduceMotion } from "@/lib/motion/useReduceMotion";

export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
