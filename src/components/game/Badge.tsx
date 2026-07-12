/**
 * Badge — small pill label used for mode, rounds, provider, tone, judge, cost,
 * beta stickers, etc. (docs/02_DESIGN.md). Presentational only.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeColor =
  | "yellow"
  | "green"
  | "blue"
  | "red"
  | "pink"
  | "purple"
  | "orange"
  | "white"
  | "ink"
  | "coin";

export type BadgeSize = "sm" | "md";

// Bright colors pair with `night` (constant near-black) so they stay readable
// when the adaptive ink token flips light in dark mode; neutral "white" pills
// use the adaptive surface token instead.
const COLOR_CLASSES: Record<BadgeColor, string> = {
  yellow: "bg-arcade-yellow text-night",
  green: "bg-arcade-green text-night",
  blue: "bg-arcade-blue text-white",
  red: "bg-arcade-red text-white",
  pink: "bg-arcade-pink text-night",
  purple: "bg-arcade-purple text-white",
  orange: "bg-arcade-orange text-night",
  white: "bg-surface text-ink",
  ink: "bg-night text-white",
  // Coin chips: a light yellow WASH (not the full arcade yellow) so the 🪙
  // emoji stays visible (owner 7/12); adaptive ink keeps dark mode readable.
  coin: "bg-arcade-yellow/30 text-ink",
};

interface BadgeProps {
  color?: BadgeColor;
  size?: BadgeSize;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Badge({
  color = "yellow",
  size = "md",
  icon,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-badge border-ink font-heading font-extrabold uppercase tracking-wide leading-none",
        size === "sm" ? "border-3 px-2 py-1 text-[10px]" : "border-3 px-2.5 py-1.5 text-xs",
        COLOR_CLASSES[color],
        className,
      )}
    >
      {icon ? <span className="text-[1.1em] leading-none">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}
