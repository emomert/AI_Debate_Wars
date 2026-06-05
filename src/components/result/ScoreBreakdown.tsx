"use client";

/**
 * ScoreBreakdown — two animated score bars for the verdict / result screens.
 * Shared by VerdictCard (debate) and FinalSummaryCard (result).
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

function Bar({
  name,
  score,
  color,
  reduce,
}: {
  name: string;
  score: number;
  color: "blue" | "red";
  reduce: boolean;
}) {
  const width = `${Math.max(0, Math.min(100, score))}%`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold">
        <span className={cn("truncate", color === "blue" ? "text-arcade-blue" : "text-arcade-red")}>
          {name}
        </span>
        <span className="font-mono">{score}</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full border-3 border-ink bg-paper">
        <motion.div
          initial={reduce ? { width } : { width: 0 }}
          animate={{ width }}
          transition={reduce ? { duration: 0 } : { duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className={cn("h-full", color === "blue" ? "bg-arcade-blue" : "bg-arcade-red")}
        />
      </div>
    </div>
  );
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
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <Bar name={nameA} score={scoreA} color="blue" reduce={reduce} />
      <Bar name={nameB} score={scoreB} color="red" reduce={reduce} />
    </div>
  );
}
