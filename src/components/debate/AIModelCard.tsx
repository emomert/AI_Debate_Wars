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
import { BrandLogo } from "@/components/report/BrandLogo";
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
  stance,
  status,
  className,
}: AIModelCardProps) {
  const d = useT();
  const reduce = useReduceMotion();
  const entry = getModelById(model.modelId);
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
        <span className={cn("shrink-0", thinking && "animate-pulse")}>
          <BrandLogo brand={entry?.brand ?? ""} size={32} />
        </span>

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
    </motion.div>
  );
}

// Memoized: the fighter cards only change when their status flips (idle →
// thinking → speaking → finished), not on every typewriter frame.
export const AIModelCard = memo(AIModelCardComponent);
