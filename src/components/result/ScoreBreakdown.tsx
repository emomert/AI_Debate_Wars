"use client";

/**
 * ScoreBreakdown — the verdict "tug-of-war" bar (owner feedback, July 2026:
 * replace the two per-fighter 0–100 bars). ONE track with 0 at the CENTER as
 * the neutral/tie state: the fill grows LEFT (blue) when Fighter A leads and
 * RIGHT (red) when Fighter B leads, by (winner's score − 50) — so a 60/40
 * verdict shows a +10 pull, capped at +50 (a 100/0 sweep fills half the track).
 * Shared by VerdictCard (debate) and SharedVerdictCard (community).
 */

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils/cn";

interface ScoreBreakdownProps {
  nameA: string;
  nameB: string;
  scoreA?: number;
  scoreB?: number;
  compact?: boolean;
}

export function ScoreBreakdown({
  nameA,
  nameB,
  scoreA,
  scoreB,
  compact,
}: ScoreBreakdownProps) {
  const reduce = Boolean(useReducedMotion());
  if (scoreA === undefined || scoreB === undefined) return null;

  // Scores are normalized to sum 100 upstream; clamp defensively anyway.
  const a = Math.max(0, Math.min(100, scoreA));
  // Pull toward A in [−50, +50]: +50 = total A sweep, −50 = total B sweep, 0 = tie.
  const pull = Math.max(-50, Math.min(50, a - 50));
  const aLeads = pull > 0;
  const tie = pull === 0;
  // The fill is anchored at the center: |pull| points = |pull|% of the track
  // (each half of the track represents 50 points).
  const width = `${Math.abs(pull)}%`;

  return (
    <div
      role="img"
      aria-label={
        tie
          ? `Tie — ${nameA} and ${nameB} scored ${a} to ${100 - a}`
          : `${aLeads ? nameA : nameB} leads by ${Math.abs(pull)} (${a} to ${100 - a})`
      }
    >
      <div
        className={cn(
          "mb-1 flex items-center justify-between gap-2 font-bold",
          compact ? "text-xs" : "text-sm",
        )}
      >
        <span className={cn("min-w-0 truncate text-arcade-blue")}>{nameA}</span>
        <span className="shrink-0 font-mono text-ink/70">
          {tie ? "0" : `${aLeads ? "◀" : "▶"} +${Math.abs(pull)}`}
        </span>
        <span className={cn("min-w-0 truncate text-right text-arcade-red")}>{nameB}</span>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-full border-3 border-ink bg-paper",
          compact ? "h-3.5" : "h-4",
        )}
      >
        {/* Fill from the center toward the leading side. */}
        {!tie ? (
          <motion.div
            initial={reduce ? { width } : { width: 0 }}
            animate={{ width }}
            transition={reduce ? { duration: 0 } : { duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className={cn(
              "absolute inset-y-0",
              aLeads ? "right-1/2 bg-arcade-blue" : "left-1/2 bg-arcade-red",
            )}
          />
        ) : null}
        {/* Center notch = the neutral/tie point. */}
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-ink" />
      </div>
    </div>
  );
}
