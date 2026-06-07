"use client";

/**
 * IconButton — square, tactile icon button for the top HUD (sound, help,
 * settings). Same press feel as ArcadeButton.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";

export type IconButtonColor = "white" | "yellow" | "purple" | "red" | "ink";

const COLOR_CLASSES: Record<IconButtonColor, string> = {
  white: "bg-surface text-ink",
  yellow: "bg-arcade-yellow text-night",
  purple: "bg-arcade-purple text-white",
  red: "bg-arcade-red text-white",
  ink: "bg-night text-white",
};

interface IconButtonProps {
  /** Accessible label is required — icons alone aren't enough (a11y). */
  label: string;
  onClick?: () => void;
  color?: IconButtonColor;
  children: ReactNode;
  className?: string;
  active?: boolean;
  silent?: boolean;
  /** Drop the chunky offset shadow — just the border (used in the top HUD). */
  flat?: boolean;
}

export function IconButton({
  label,
  onClick,
  color = "white",
  children,
  className,
  active,
  silent,
  flat,
}: IconButtonProps) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={() => {
        if (!silent) playSound("buttonClick");
        onClick?.();
      }}
      whileHover={
        reduce || flat ? undefined : { y: -2, boxShadow: "5px 5px 0 var(--shadow-ink)" }
      }
      whileTap={
        reduce ? undefined : flat ? { scale: 0.94 } : { x: 2, y: 2, boxShadow: "1px 1px 0 var(--shadow-ink)" }
      }
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={flat ? undefined : { boxShadow: "3px 3px 0 var(--shadow-ink)" }}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-btn border-3 border-ink text-lg",
        // Tight, rounded focus ring that hugs the button — overrides the global
        // 3px/offset-3 ring, which on a small (motion-transformed) icon button
        // renders as a detached square "stroke" beside it.
        "focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-ink",
        COLOR_CLASSES[color],
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
