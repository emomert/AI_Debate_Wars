"use client";

/**
 * AIModelCard — a fighter/character card (docs/02). Shows the model identity
 * and a live status: idle, thinking, speaking, finished or error.
 */

import { memo } from "react";
import { motion } from "framer-motion";

import type { ModelColor, SelectedModel, Stance } from "@/lib/debate/debateTypes";
import { getModelById } from "@/lib/models/modelRegistry";
import { Badge } from "@/components/game/Badge";
import { cn } from "@/lib/utils/cn";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import { useT } from "@/lib/i18n/LocaleProvider";

export type ModelCardStatus =
  | "idle"
  | "thinking"
  | "speaking"
  | "finished"
  | "error";

interface AIModelCardProps {
  model: SelectedModel;
  side: "A" | "B" | "Judge";
  role: string;
  stance?: Stance;
  status: ModelCardStatus;
  className?: string;
}

const ACCENT_RING: Record<ModelColor, string> = {
  blue: "ring-arcade-blue",
  red: "ring-arcade-red",
  yellow: "ring-arcade-yellow",
  purple: "ring-arcade-purple",
};

const ACCENT_TEXT: Record<ModelColor, string> = {
  blue: "text-arcade-blue",
  red: "text-arcade-red",
  yellow: "text-arcade-orange",
  purple: "text-arcade-purple",
};

const STATUS_COLOR: Record<
  ModelCardStatus,
  "white" | "yellow" | "green" | "red" | "blue"
> = {
  idle: "white",
  thinking: "yellow",
  speaking: "green",
  finished: "blue",
  error: "red",
};

function AIModelCardComponent({
  model,
  side,
  role,
  stance,
  status,
  className,
}: AIModelCardProps) {
  const d = useT();
  const reduce = useReduceMotion();
  const entry = getModelById(model.modelId);
  const avatar = entry?.avatar ?? "🤖";
  const color = model.color;
  const speaking = status === "speaking";
  const thinking = status === "thinking";
  // Reduced motion: hold the card still instead of bouncing it forever while the
  // fighter speaks (framer drives this in JS, so the CSS reduce-motion freeze
  // can't reach it).
  const bounce = speaking && !reduce;
  const badge = { label: d.debate.card.status[status], color: STATUS_COLOR[status] };

  return (
    <motion.div
      animate={bounce ? { y: [0, -3, 0] } : { y: 0 }}
      transition={
        bounce
          ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
      }
      className={cn(
        "rounded-card border-4 border-ink bg-card p-3 shadow-hard-sm transition",
        speaking && cn("ring-4 ring-offset-2 ring-offset-paper", ACCENT_RING[color]),
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <span
            className={cn(
              "grid h-12 w-12 place-items-center rounded-btn border-3 border-ink bg-paper text-2xl",
              thinking && "animate-pulse",
            )}
          >
            {avatar}
          </span>
          <span
            className={cn(
              "absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink text-[11px] font-extrabold",
              // Text pairs per fill: white only reads on the dark fills; the
              // orange fill takes constant night in BOTH themes (white-on-orange
              // was illegible and the dark guard would flip it anyway).
              color === "blue" && "bg-arcade-blue text-white",
              color === "red" && "bg-arcade-red text-white",
              color === "purple" && "bg-arcade-purple text-white",
              color === "yellow" && "bg-arcade-orange text-night",
            )}
          >
            {side === "Judge" ? "J" : side}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Mobile: the fighter cards sit two-up in a narrow grid, so long
              model names WRAP instead of being cut off; lg+ (240px asides)
              keeps the tidy single-line truncation. */}
          <p
            className={cn(
              "break-words font-heading text-sm font-extrabold leading-tight lg:truncate lg:text-base",
              ACCENT_TEXT[color],
            )}
          >
            {model.displayName}
          </p>
          <p className="truncate text-xs font-semibold text-ink/55">
            {model.nickname}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge color={badge.color} size="sm">
          {badge.label}
        </Badge>
        {stance ? (
          <Badge color={stance === "pro" ? "blue" : "red"} size="sm">
            {stance === "pro" ? d.debate.card.pro : d.debate.card.against}
          </Badge>
        ) : null}
      </div>
      {/* Role sentence is hidden on the cramped mobile two-up cards (it only
          shows in the roomy lg+ side cards) so A/B cards don't balloon unevenly. */}
      <p className="mt-2 hidden text-xs text-ink/60 lg:block">{role}</p>
    </motion.div>
  );
}

// Memoized: the fighter cards only change when their status flips (idle →
// thinking → speaking → finished), not on every typewriter frame.
export const AIModelCard = memo(AIModelCardComponent);
