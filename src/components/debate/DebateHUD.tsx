"use client";

/**
 * DebateHUD — the sticky top status bar for the arena: round counter, live
 * status and the running total cost (docs/01 Feature 8, docs/08).
 */

import { memo } from "react";
import { motion } from "framer-motion";

import type {
  DebateMode,
  DebatePace,
  SessionCostSummary,
} from "@/lib/debate/debateTypes";
import type { RunnerPhase } from "@/lib/debate/useDebateRunner";
import { RoundCounter } from "@/components/debate/RoundCounter";
import { Badge } from "@/components/game/Badge";
import { formatCost, formatTokens } from "@/lib/utils/format";

const PHASE_LABEL: Record<
  RunnerPhase,
  { text: string; color: "yellow" | "green" | "purple" | "white" | "red" | "blue" }
> = {
  thinking: { text: "Thinking…", color: "yellow" },
  streaming: { text: "Speaking", color: "green" },
  judging: { text: "Judge entering", color: "purple" },
  awaiting: { text: "Your move", color: "blue" },
  done: { text: "Complete", color: "white" },
  stopped: { text: "Stopped", color: "red" },
  error: { text: "Error", color: "red" },
};

interface DebateHUDProps {
  mode: DebateMode;
  currentRound: number;
  totalRounds: number;
  roundLabel?: string;
  costSummary: SessionCostSummary;
  phase: RunnerPhase;
  messageCount: number;
  /** Name of the model currently generating, for the live top bar. */
  activeModelName?: string;
  pace: DebatePace;
  onTogglePace: () => void;
}

function DebateHUDComponent({
  mode,
  currentRound,
  totalRounds,
  roundLabel,
  costSummary,
  phase,
  messageCount,
  activeModelName,
  pace,
  onTogglePace,
}: DebateHUDProps) {
  const status = PHASE_LABEL[phase];
  const showActive = activeModelName && (phase === "thinking" || phase === "streaming");
  const live = phase !== "done" && phase !== "stopped" && phase !== "error";
  return (
    <div className="sticky top-[68px] z-20 -mx-4 border-b-4 border-ink bg-paper/90 px-4 py-2.5 backdrop-blur sm:top-[76px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RoundCounter
            mode={mode}
            roundNumber={currentRound}
            totalRounds={totalRounds}
            roundLabel={roundLabel}
          />
          <Badge color={status.color} size="sm">
            {status.text}
          </Badge>
          {showActive ? (
            <Badge color="white" size="sm">
              🎤 {activeModelName}
            </Badge>
          ) : null}
          {live ? (
            <button
              type="button"
              onClick={onTogglePace}
              aria-label={`Pacing: ${pace === "auto" ? "Fast" : "Normal"}. Click to switch.`}
              className="inline-flex items-center gap-1 rounded-badge border-3 border-ink bg-white px-2 py-1 text-[11px] font-extrabold uppercase transition hover:bg-arcade-yellow focus-visible:outline-3 focus-visible:outline-offset-2"
            >
              {pace === "auto" ? "⚡ Fast" : "🚶 Normal"}
            </button>
          ) : null}
        </div>

        <motion.div
          key={costSummary.totalCost.toFixed(4)}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className="inline-flex items-center gap-2 rounded-btn border-3 border-ink bg-ink px-2.5 py-1 font-mono text-xs font-bold text-arcade-green"
          aria-label="Total cost so far"
        >
          <span aria-hidden>💰</span>
          <span>{formatCost(costSummary.totalCost)}</span>
          <span className="text-white/50">·</span>
          <span className="text-white/70">{formatTokens(costSummary.totalTokens)}</span>
          <span className="text-white/50">·</span>
          <span className="text-white/70">{messageCount} msg</span>
        </motion.div>
      </div>
    </div>
  );
}

// Memoized: the HUD's props are stable during a turn's typewriter, so it no
// longer re-renders ~60×/sec while text is streaming.
export const DebateHUD = memo(DebateHUDComponent);
