"use client";

/**
 * RoundSelector — pick 3 / 5 / 7 rounds (docs/04). Segmented arcade control.
 */

import { ROUND_OPTIONS } from "@/lib/constants";
import type { RoundCount } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

interface RoundSelectorProps {
  value: RoundCount;
  onChange: (count: RoundCount) => void;
  /** Deep Debate locks the round count — render read-only. */
  disabled?: boolean;
}

export function RoundSelector({ value, onChange, disabled = false }: RoundSelectorProps) {
  const d = useT();
  return (
    <div
      role="radiogroup"
      aria-label={d.setup.rules.rounds}
      className="grid grid-cols-3 gap-2 sm:gap-3"
    >
      {ROUND_OPTIONS.map((opt) => {
        const selected = value === opt.count;
        const copy = d.setup.rounds[opt.count];
        return (
          <button
            key={opt.count}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            aria-disabled={disabled}
            onClick={() => {
              if (disabled) return;
              playSound("buttonClick");
              onChange(opt.count);
            }}
            className={cn(
              "rounded-card border-4 border-ink p-3 text-center transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              disabled && "cursor-not-allowed",
              disabled && !selected && "opacity-50",
              selected
                ? cn("bg-arcade-green text-night shadow-hard", !disabled && "-translate-y-0.5")
                : cn(
                    "bg-surface shadow-hard-sm",
                    !disabled && "hover:-translate-y-0.5 hover:shadow-hard",
                  ),
            )}
          >
            <div className="font-display text-3xl leading-none sm:text-4xl">
              {opt.count}
            </div>
            <div className="mt-1 font-heading text-xs font-extrabold uppercase sm:text-sm">
              {copy.label}
            </div>
            <div
              className={cn(
                "text-[10px] sm:text-xs",
                selected ? "text-night/60" : "text-ink/55",
              )}
            >
              {copy.blurb}
            </div>
          </button>
        );
      })}
    </div>
  );
}
