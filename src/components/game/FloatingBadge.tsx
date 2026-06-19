"use client";

/**
 * FloatingBadge — a playful rotated sticker (e.g. "BETA", "DAILY GAME") that
 * gently floats. Used to decorate the hero and panels.
 */

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";

interface FloatingBadgeProps {
  children: ReactNode;
  className?: string;
  rotate?: number;
  color?: "yellow" | "pink" | "green" | "purple";
}

const COLOR: Record<NonNullable<FloatingBadgeProps["color"]>, string> = {
  yellow: "bg-arcade-yellow text-night",
  pink: "bg-arcade-pink text-night",
  green: "bg-arcade-green text-night",
  purple: "bg-arcade-purple text-white",
};

export function FloatingBadge({
  children,
  className,
  rotate = -6,
  color = "yellow",
}: FloatingBadgeProps) {
  const reduce = useReduceMotion();
  return (
    <motion.span
      initial={{ rotate }}
      animate={reduce ? { rotate } : { y: [0, -4, 0], rotate }}
      // Don't arm an infinite transition under reduced motion (otherwise any
      // future animated prop silently reintroduces perpetual motion).
      transition={reduce ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ boxShadow: "3px 3px 0 var(--shadow-ink)" }}
      className={cn(
        "inline-block rounded-badge border-3 border-ink px-3 py-1 font-heading text-xs font-extrabold uppercase tracking-wider",
        COLOR[color],
        className,
      )}
    >
      {children}
    </motion.span>
  );
}
