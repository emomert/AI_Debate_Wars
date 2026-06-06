"use client";

/**
 * ToneSelector — pick a debate tone (docs/05 tone presets). Chip grid.
 */

import { TONE_OPTIONS } from "@/lib/constants";
import type { DebateTone } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";

interface ToneSelectorProps {
  value: DebateTone;
  onChange: (tone: DebateTone) => void;
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Tone"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {TONE_OPTIONS.map((opt) => {
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
              "flex items-center gap-1.5 rounded-btn border-3 border-ink px-2.5 py-2 text-sm font-bold transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              selected
                ? "bg-arcade-pink text-night shadow-hard-sm"
                : "bg-surface hover:bg-arcade-yellow hover:text-night",
            )}
          >
            <span aria-hidden>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
