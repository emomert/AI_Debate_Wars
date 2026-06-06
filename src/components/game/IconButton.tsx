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
}

export function IconButton({
  label,
  onClick,
  color = "white",
  children,
  className,
  active,
  silent,
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
      whileHover={reduce ? undefined : { y: -2, boxShadow: "5px 5px 0 #050505" }}
      whileTap={reduce ? undefined : { x: 2, y: 2, boxShadow: "1px 1px 0 #050505" }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{ boxShadow: "3px 3px 0 #050505" }}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-btn border-3 border-ink text-lg",
        COLOR_CLASSES[color],
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
