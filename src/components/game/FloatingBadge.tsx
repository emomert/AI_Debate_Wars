"use client";

/**
 * FloatingBadge — a playful rotated sticker (e.g. "BETA", "DAILY GAME") that
 * gently floats. Used to decorate the hero and panels.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

interface FloatingBadgeProps {
  children: ReactNode;
  className?: string;
  rotate?: number;
  color?: "yellow" | "pink" | "green" | "purple";
}

const COLOR: Record<NonNullable<FloatingBadgeProps["color"]>, string> = {
  yellow: "bg-arcade-yellow text-ink",
  pink: "bg-arcade-pink text-ink",
  green: "bg-arcade-green text-ink",
  purple: "bg-arcade-purple text-white",
};

export function FloatingBadge({
  children,
  className,
  rotate = -6,
  color = "yellow",
}: FloatingBadgeProps) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={{ rotate }}
      animate={reduce ? { rotate } : { y: [0, -4, 0], rotate }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ boxShadow: "3px 3px 0 #050505" }}
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
