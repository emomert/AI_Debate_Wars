"use client";

/**
 * PaceSelector — Normal (manual, click to reveal each turn) vs Fast (auto-plays).
 */

import { PACE_OPTIONS } from "@/lib/constants";
import type { DebatePace } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";

interface PaceSelectorProps {
  value: DebatePace;
  onChange: (pace: DebatePace) => void;
}

export function PaceSelector({ value, onChange }: PaceSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Pacing" className="grid grid-cols-2 gap-2">
      {PACE_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              playSound("buttonClick");
              onChange(opt.id);
            }}
            className={cn(
              "rounded-card border-4 border-ink p-3 text-left transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              selected
                ? "-translate-y-0.5 bg-arcade-blue text-white shadow-hard"
                : "bg-surface shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard",
            )}
          >
            <div className="font-heading text-base font-extrabold">
              <span aria-hidden className="mr-1.5">{opt.emoji}</span>
              {opt.label}
            </div>
            <div className={cn("text-xs", selected ? "text-white/80" : "text-ink/55")}>
              {opt.blurb}
            </div>
          </button>
        );
      })}
    </div>
  );
}
