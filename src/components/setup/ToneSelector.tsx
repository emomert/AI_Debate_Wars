"use client";

/**
 * ToneSelector — pick a debate tone (docs/05 tone presets). Chip grid. The 4th
 * chip, "Custom", reveals a free-text input so the user can describe any tone.
 */

import { CUSTOM_TONE_MAX_LENGTH, TONE_OPTIONS } from "@/lib/constants";
import type { DebateTone } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

interface ToneSelectorProps {
  value: DebateTone;
  onChange: (tone: DebateTone) => void;
  customTone: string;
  onCustomToneChange: (value: string) => void;
  error?: string;
  /** Deep Debate locks the tone — render read-only. */
  disabled?: boolean;
}

export function ToneSelector({
  value,
  onChange,
  customTone,
  onCustomToneChange,
  error,
  disabled = false,
}: ToneSelectorProps) {
  const d = useT();
  return (
    <div>
      <div
        role="radiogroup"
        aria-label={d.setup.rules.tone}
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
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => {
                if (disabled) return;
                playSound("buttonClick");
                onChange(opt.id);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-btn border-3 border-ink px-2.5 py-2 text-sm font-bold transition",
                "focus-visible:outline-3 focus-visible:outline-offset-2",
                disabled && !selected && "cursor-not-allowed opacity-50",
                disabled && selected && "cursor-not-allowed",
                selected
                  ? "bg-arcade-pink text-night shadow-hard-sm"
                  : cn("bg-surface", !disabled && "hover:bg-arcade-yellow hover:text-night"),
              )}
            >
              <span aria-hidden>{opt.emoji}</span>
              <span>{d.setup.tones[opt.id].label}</span>
            </button>
          );
        })}
      </div>

      {/* Free-text input appears BELOW the grid so the chip row never reflows. */}
      {value === "custom" ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="custom-tone" className="text-xs font-bold uppercase tracking-wide text-ink/55">
              {d.setup.toneCustom.describe}
            </label>
            <span
              className={cn(
                "font-mono text-[11px]",
                customTone.length > CUSTOM_TONE_MAX_LENGTH ? "text-arcade-red" : "text-ink/45",
              )}
            >
              {customTone.length}/{CUSTOM_TONE_MAX_LENGTH}
            </span>
          </div>
          <input
            id="custom-tone"
            type="text"
            value={customTone}
            maxLength={CUSTOM_TONE_MAX_LENGTH + 10}
            onChange={(e) => onCustomToneChange(e.target.value)}
            placeholder={d.setup.toneCustom.placeholder}
            aria-invalid={Boolean(error)}
            className={cn(
              "w-full rounded-btn border-3 bg-surface px-3 py-2 text-sm outline-none",
              "placeholder:text-ink/35 focus-visible:outline-3 focus-visible:outline-offset-2",
              error ? "border-arcade-red" : "border-ink",
            )}
          />
          {error ? (
            <p className="mt-1 text-xs font-bold text-arcade-red">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
