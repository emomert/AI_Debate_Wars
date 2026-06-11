"use client";

/**
 * FlowDiagram — a clickable arcade-style step diagram. Renders the steps as a
 * row of chunky nodes joined by arrows; clicking a node shows its detail card
 * below. Used for the match-control lifecycle and the Deep Debate pipeline.
 */

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface FlowStep {
  key: string;
  icon: string;
  /** Short label shown inside the node. */
  node: string;
  /** Full heading shown in the detail card. */
  title: string;
  body: ReactNode;
}

export function FlowDiagram({ steps, hint }: { steps: FlowStep[]; hint?: string }) {
  const [selected, setSelected] = useState(0);
  const current = steps[Math.min(selected, steps.length - 1)];

  return (
    <div>
      {hint ? <p className="mb-3 text-xs text-ink/55">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5 sm:gap-2">
            {i > 0 ? (
              <span aria-hidden className="font-display text-lg text-ink/40">
                →
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setSelected(i)}
              aria-expanded={selected === i}
              className={cn(
                "flex items-center gap-1.5 rounded-card border-3 border-ink px-2.5 py-1.5 text-left transition",
                selected === i
                  ? "-translate-y-0.5 bg-arcade-yellow text-night shadow-hard-sm"
                  : "bg-surface hover:-translate-y-0.5 hover:shadow-hard-sm",
              )}
            >
              <span aria-hidden className="text-base leading-none">
                {s.icon}
              </span>
              <span className="font-heading text-xs font-extrabold uppercase tracking-wide">
                {s.node}
              </span>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-card border-3 border-ink bg-surface p-3.5 shadow-hard-sm">
        <p className="font-heading text-sm font-extrabold">
          <span aria-hidden className="mr-1.5">{current.icon}</span>
          {current.title}
        </p>
        <p className="mt-1 text-sm text-ink/75">{current.body}</p>
      </div>
    </div>
  );
}
