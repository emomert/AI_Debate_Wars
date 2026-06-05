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
}

export function ResponseLengthSelector({
  value,
  onChange,
}: ResponseLengthSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Max response length"
      className="grid grid-cols-3 gap-2"
    >
      {LENGTH_OPTIONS.map((opt) => {
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
              "rounded-btn border-3 border-ink px-2 py-2 text-center transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              selected ? "bg-arcade-orange shadow-hard-sm" : "bg-white hover:bg-arcade-yellow",
            )}
          >
            <div className="font-heading text-sm font-extrabold uppercase">
              {opt.label}
            </div>
            <div className="text-[10px] text-ink/55">{opt.blurb}</div>
          </button>
        );
      })}
    </div>
  );
}
