"use client";

/**
 * ArcadeButton — the single primary-action component (docs/02_DESIGN.md).
 * Thick black border, hard offset shadow, chunky uppercase type, and a tactile
 * press driven by Framer Motion (hover lifts, tap depresses the shadow exactly
 * like the pressed-state spec in the design doc).
 */

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";

export type ArcadeButtonVariant =
  | "primary-green"
  | "primary-yellow"
  | "model-blue"
  | "model-red"
  | "danger-red"
  | "neutral-white"
  | "judge-purple";

export type ArcadeButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ArcadeButtonVariant, string> = {
  "primary-green": "bg-arcade-green text-ink",
  "primary-yellow": "bg-arcade-yellow text-ink",
  "model-blue": "bg-arcade-blue text-white",
  "model-red": "bg-arcade-red text-white",
  "danger-red": "bg-arcade-red text-white",
  "neutral-white": "bg-white text-ink",
  "judge-purple": "bg-arcade-purple text-white",
};

const SIZE_CLASSES: Record<ArcadeButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-btn border-3",
  md: "px-5 py-2.5 text-base rounded-btn border-4",
  lg: "px-7 py-3.5 text-lg sm:text-xl rounded-btn border-4",
};

interface ArcadeButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: ArcadeButtonVariant;
  size?: ArcadeButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export function ArcadeButton({
  variant = "primary-green",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  onClick,
  type = "button",
  ...rest
}: ArcadeButtonProps) {
  const reduce = useReducedMotion();

  const restShadow = "6px 6px 0 #050505";
  const hoverShadow = "8px 8px 0 #050505";
  const pressShadow = "2px 2px 0 #050505";

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        playSound("buttonClick");
        onClick?.(e);
      }}
      initial={false}
      animate={{ boxShadow: restShadow, x: 0, y: 0 }}
      whileHover={disabled || reduce ? undefined : { y: -2, boxShadow: hoverShadow }}
      whileTap={
        disabled || reduce ? undefined : { x: 3, y: 3, boxShadow: pressShadow }
      }
      transition={{ duration: 0.12, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center justify-center gap-2 border-ink font-heading font-extrabold uppercase tracking-wide select-none",
        "focus-visible:outline-3 focus-visible:outline-offset-2",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        fullWidth && "w-full",
        disabled && "cursor-not-allowed opacity-50 grayscale",
        className,
      )}
      style={{ boxShadow: restShadow }}
      {...rest}
    >
      {leftIcon}
      <span className="truncate">{children}</span>
      {rightIcon}
    </motion.button>
  );
}
