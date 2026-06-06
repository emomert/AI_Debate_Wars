"use client";

/**
 * RoundSelector — pick 3 / 5 / 7 rounds (docs/04). Segmented arcade control.
 */

import { ROUND_OPTIONS } from "@/lib/constants";
import type { RoundCount } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";

interface RoundSelectorProps {
  value: RoundCount;
  onChange: (count: RoundCount) => void;
}

export function RoundSelector({ value, onChange }: RoundSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Number of rounds"
      className="grid grid-cols-3 gap-2 sm:gap-3"
    >
      {ROUND_OPTIONS.map((opt) => {
        const selected = value === opt.count;
        return (
          <button
            key={opt.count}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              playSound("buttonClick");
              onChange(opt.count);
            }}
            className={cn(
              "rounded-card border-4 border-ink p-3 text-center transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              selected
                ? "-translate-y-0.5 bg-arcade-green text-night shadow-hard"
                : "bg-surface shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard",
            )}
          >
            <div className="font-display text-3xl leading-none sm:text-4xl">
              {opt.count}
            </div>
            <div className="mt-1 font-heading text-xs font-extrabold uppercase sm:text-sm">
              {opt.label}
            </div>
            <div
              className={cn(
                "text-[10px] sm:text-xs",
                selected ? "text-night/60" : "text-ink/55",
              )}
            >
              {opt.blurb}
            </div>
          </button>
        );
      })}
    </div>
  );
}
