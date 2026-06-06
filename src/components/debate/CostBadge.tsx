"use client";

/**
 * CostBadge — compact per-message cost (docs/08). Shows
 * "$0.0031 • 842 tok • 2.4s" and expands to a token/cost breakdown on click.
 * Reads pre-computed cost data; never calculates pricing itself.
 */

import { useState } from "react";

import type { CostBreakdown, TokenUsage } from "@/lib/debate/debateTypes";
import { costBadgeText, formatCost, formatLatency, formatTokens } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface CostBadgeProps {
  cost?: CostBreakdown;
  usage?: TokenUsage;
  latencyMs?: number;
  className?: string;
}

export function CostBadge({ cost, usage, latencyMs, className }: CostBadgeProps) {
  const [open, setOpen] = useState(false);

  if (!cost || !usage) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-badge border-3 border-ink/30 bg-paper px-2 py-1 font-mono text-[11px] text-ink/50",
          className,
        )}
      >
        calculating…
      </span>
    );
  }

  return (
    <div className={cn("inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-badge border-3 border-ink bg-night px-2 py-1 font-mono text-[11px] font-semibold text-white transition hover:bg-night/80 focus-visible:outline-3 focus-visible:outline-offset-2"
      >
        <span aria-hidden>💰</span>
        <span>{costBadgeText(cost.totalCost, usage.totalTokens, latencyMs)}</span>
        {cost.estimated ? <span className="text-arcade-yellow">~est</span> : null}
        <span aria-hidden className="text-white/60">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 rounded-card border-3 border-ink bg-surface p-2.5 font-mono text-[11px]">
          <dt className="text-ink/55">Input</dt>
          <dd className="text-right">{formatTokens(usage.inputTokens)}</dd>
          <dt className="text-ink/55">Output</dt>
          <dd className="text-right">{formatTokens(usage.outputTokens)}</dd>
          <dt className="text-ink/55">Input cost</dt>
          <dd className="text-right">{formatCost(cost.inputCost)}</dd>
          <dt className="text-ink/55">Output cost</dt>
          <dd className="text-right">{formatCost(cost.outputCost)}</dd>
          <dt className="text-ink/55">Latency</dt>
          <dd className="text-right">{formatLatency(latencyMs)}</dd>
          <dt className="font-bold text-ink">Total</dt>
          <dd className="text-right font-bold">{formatCost(cost.totalCost)}</dd>
        </dl>
      ) : null}
    </div>
  );
}
