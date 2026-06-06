"use client";

/**
 * ResponseLengthSelector — short / medium / long max response length
 * (docs/05 length presets; this is the "max response length" Setup field).
 */

import { LENGTH_OPTIONS } from "@/lib/constants";
import type { ResponseLength } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";

interface ResponseLengthSelectorProps {
  value: ResponseLength;
  onChange: (length: ResponseLength) => void;
  /** Deep Debate locks length to its template — disable the chips. */
  disabled?: boolean;
}

export function ResponseLengthSelector({
  value,
  onChange,
  disabled = false,
}: ResponseLengthSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Max response length"
      aria-disabled={disabled}
      className={cn("grid grid-cols-3 gap-2", disabled && "opacity-50")}
    >
      {LENGTH_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              playSound("buttonClick");
              onChange(opt.id);
            }}
            className={cn(
              "group rounded-btn border-3 border-ink px-2 py-2 text-center transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              disabled && "cursor-not-allowed",
              selected
                ? "bg-arcade-orange text-night shadow-hard-sm"
                : "bg-surface hover:bg-arcade-yellow hover:text-night",
            )}
          >
            <div className="font-heading text-sm font-extrabold uppercase">
              {opt.label}
            </div>
            {/* group-hover: the blurb must flip with the yellow hover fill too —
                its own text-ink class would otherwise stay light in dark mode. */}
            <div
              className={cn(
                "text-[10px]",
                selected ? "text-night/60" : "text-ink/55 group-hover:text-night/60",
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
