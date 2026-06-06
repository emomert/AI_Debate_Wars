"use client";

/**
 * ModeSelector — choose Debate vs Discussion. Renders the two modes as large,
 * selectable character-style cards (docs/09 "Set the rules").
 */

import { MODE_OPTIONS } from "@/lib/constants";
import type { DebateMode } from "@/lib/debate/debateTypes";
import { Badge } from "@/components/game/Badge";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";

interface ModeSelectorProps {
  value: DebateMode;
  onChange: (mode: DebateMode) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Debate mode"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {MODE_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              playSound("modeSelect");
              onChange(opt.id);
            }}
            className={cn(
              "rounded-card border-4 border-ink p-4 text-left transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              selected
                ? "-translate-y-0.5 bg-arcade-yellow text-night shadow-hard"
                : "bg-surface shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading text-xl font-extrabold">
                <span aria-hidden className="mr-1.5 text-2xl">{opt.emoji}</span>
                {opt.title}
              </span>
              {selected ? <Badge color="green" size="sm">Picked</Badge> : null}
            </div>
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                selected ? "text-night/70" : "text-ink/70",
              )}
            >
              {opt.tagline}
            </p>
            <p className={cn("mt-2 text-sm", selected ? "text-night/60" : "text-ink/60")}>
              {opt.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge color="blue" size="sm">A · {opt.modelARole}</Badge>
              <Badge color="red" size="sm">B · {opt.modelBRole}</Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}
