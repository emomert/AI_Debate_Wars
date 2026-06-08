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
import { useT } from "@/lib/i18n/LocaleProvider";

interface CostBadgeProps {
  cost?: CostBreakdown;
  usage?: TokenUsage;
  latencyMs?: number;
  className?: string;
}

export function CostBadge({ cost, usage, latencyMs, className }: CostBadgeProps) {
  const d = useT();
  const [open, setOpen] = useState(false);

  if (!cost || !usage) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-badge border-3 border-ink/30 bg-paper px-2 py-1 font-mono text-[11px] text-ink/50",
          className,
        )}
      >
        {d.debate.cost.calculating}
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
        {cost.searchCost ? (
          <span className="text-arcade-purple" title={d.debate.cost.searchFee}>🔎</span>
        ) : null}
        {cost.cachedSavings ? (
          <span
            className="text-arcade-green"
            title={d.debate.cost.cachedTitle(formatCost(cost.cachedSavings))}
          >
            ♻️
          </span>
        ) : null}
        {cost.estimated ? <span className="text-arcade-yellow">{d.debate.cost.est}</span> : null}
        <span aria-hidden className="text-white/60">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 rounded-card border-3 border-ink bg-surface p-2.5 font-mono text-[11px]">
          <dt className="text-ink/55">{d.debate.cost.input}</dt>
          <dd className="text-right">{formatTokens(usage.inputTokens)}</dd>
          {usage.cachedInputTokens && cost.cachedSavings ? (
            <>
              <dt className="text-ink/55">{d.debate.cost.cachedInput}</dt>
              <dd className="text-right text-arcade-green">
                {formatTokens(usage.cachedInputTokens)} (−{formatCost(cost.cachedSavings)})
              </dd>
            </>
          ) : null}
          <dt className="text-ink/55">{d.debate.cost.output}</dt>
          <dd className="text-right">{formatTokens(usage.outputTokens)}</dd>
          <dt className="text-ink/55">{d.debate.cost.inputCost}</dt>
          <dd className="text-right">{formatCost(cost.inputCost)}</dd>
          <dt className="text-ink/55">{d.debate.cost.outputCost}</dt>
          <dd className="text-right">{formatCost(cost.outputCost)}</dd>
          {cost.searchCost ? (
            <>
              <dt className="text-ink/55">{d.debate.cost.webSearch}</dt>
              <dd className="text-right">{formatCost(cost.searchCost)}</dd>
            </>
          ) : null}
          <dt className="text-ink/55">{d.debate.cost.latency}</dt>
          <dd className="text-right">{formatLatency(latencyMs)}</dd>
          <dt className="font-bold text-ink">{d.debate.cost.total}</dt>
          <dd className="text-right font-bold">{formatCost(cost.totalCost)}</dd>
        </dl>
      ) : null}
    </div>
  );
}
