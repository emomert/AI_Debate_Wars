"use client";

/**
 * ToneSelector — pick a debate tone (docs/05 tone presets). Chip grid. The 4th
 * chip, "Custom", reveals a free-text input so the user can describe any tone.
 *
 * Preset tones apply to BOTH fighters. A custom tone applies to both by default,
 * but the user can opt to give each fighter a different tone (customToneA/B,
 * each falling back to the shared customTone).
 *
 * Easter egg: 5 rapid clicks on the Aggressive chip unlock the hidden 🤬
 * UNHINGED tone (roast-battle mode — see promptBuilder TONE_INSTRUCTIONS).
 * The unlock persists for the browsing session.
 */

import { useEffect, useRef, useState } from "react";

import {
  CUSTOM_TONE_MAX_LENGTH,
  TONE_OPTIONS,
  UNHINGED_TONE_OPTION,
} from "@/lib/constants";
import type { DebateTone } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

interface ToneSelectorProps {
  value: DebateTone;
  onChange: (tone: DebateTone) => void;
  /** Shared custom tone (applies to both fighters unless overridden per-fighter). */
  customTone: string;
  onCustomToneChange: (value: string) => void;
  /** Optional per-fighter custom tones. */
  customToneA: string;
  onCustomToneAChange: (value: string) => void;
  customToneB: string;
  onCustomToneBChange: (value: string) => void;
  /** Display names used to label the per-fighter inputs. */
  fighterALabel: string;
  fighterBLabel: string;
  error?: string;
  /** Deep Debate locks the tone — render read-only. */
  disabled?: boolean;
}

export function ToneSelector({
  value,
  onChange,
  customTone,
  onCustomToneChange,
  customToneA,
  onCustomToneAChange,
  customToneB,
  onCustomToneBChange,
  fighterALabel,
  fighterBLabel,
  error,
  disabled = false,
}: ToneSelectorProps) {
  const d = useT();
  const [perFighter, setPerFighter] = useState<boolean>(
    () => Boolean(customToneA.trim() || customToneB.trim()),
  );

  // 🤬 UNHINGED unlock — survives navigation within the tab (sessionStorage)
  // and re-derives from a rehydrated config that already carries the tone.
  // Hydrated in an effect (not the initializer) so SSR and the first client
  // render agree — reading storage during render is a hydration mismatch.
  const UNLOCK_KEY = "ada:unhinged-unlocked";
  const [unhingedUnlocked, setUnhingedUnlocked] = useState(false);
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(UNLOCK_KEY) === "1") setUnhingedUnlocked(true);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (value === "unhinged") setUnhingedUnlocked(true);
  }, [value]);
  const aggressiveClicksRef = useRef<number[]>([]);
  // Bumped to re-trigger the chip's shake animation (key change → remount) on
  // unlock and on every (re)selection of the unhinged tone.
  const [shakeNonce, setShakeNonce] = useState(0);

  const handleToneClick = (tone: DebateTone) => {
    if (disabled) return;
    if (tone === "aggressive" && !unhingedUnlocked) {
      const now = Date.now();
      const clicks = [...aggressiveClicksRef.current.filter((t) => now - t < 3000), now];
      aggressiveClicksRef.current = clicks;
      if (clicks.length >= 5) {
        setUnhingedUnlocked(true);
        setShakeNonce((n) => n + 1);
        try {
          window.sessionStorage.setItem(UNLOCK_KEY, "1");
        } catch {
          /* ignore */
        }
        playSound("modeSelect");
        onChange("unhinged");
        return;
      }
    }
    if (tone === "unhinged") {
      setShakeNonce((n) => n + 1);
      playSound("modeSelect");
    } else {
      playSound("buttonClick");
    }
    onChange(tone);
  };

  const toneOptions = unhingedUnlocked ? [...TONE_OPTIONS, UNHINGED_TONE_OPTION] : TONE_OPTIONS;

  // Config rehydrates from sessionStorage a tick after mount (ArenaContext), so
  // per-fighter tones can arrive AFTER the one-shot initializer ran. Re-sync the
  // checkbox ON when overrides appear (force-true only, so a deliberate un-check
  // is never overridden). Mirrors ModelSelector's rehydration re-sync.
  useEffect(() => {
    if (customToneA.trim() || customToneB.trim()) setPerFighter(true);
  }, [customToneA, customToneB]);

  const togglePerFighter = (next: boolean) => {
    playSound("buttonClick");
    setPerFighter(next);
    if (next) {
      // Seed each fighter from the shared tone so the intent persists.
      if (!customToneA.trim() && customTone.trim()) onCustomToneAChange(customTone);
      if (!customToneB.trim() && customTone.trim()) onCustomToneBChange(customTone);
    } else {
      // Collapse back to one shared tone: keep a value if the shared is empty.
      if (!customTone.trim()) {
        const fallback = customToneA.trim() || customToneB.trim();
        if (fallback) onCustomToneChange(fallback);
      }
      onCustomToneAChange("");
      onCustomToneBChange("");
    }
  };

  const toneField = (opts: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={opts.id} className="text-xs font-bold uppercase tracking-wide text-ink/55">
          {opts.label}
        </label>
        <span
          className={cn(
            "font-mono text-[11px]",
            opts.value.length > CUSTOM_TONE_MAX_LENGTH ? "text-arcade-red" : "text-ink/45",
          )}
        >
          {opts.value.length}/{CUSTOM_TONE_MAX_LENGTH}
        </span>
      </div>
      <input
        id={opts.id}
        type="text"
        value={opts.value}
        maxLength={CUSTOM_TONE_MAX_LENGTH + 10}
        onChange={(e) => opts.onChange(e.target.value)}
        placeholder={d.setup.toneCustom.placeholder}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full rounded-btn border-3 bg-surface px-3 py-2 text-sm outline-none",
          "placeholder:text-ink/35 focus-visible:outline-3 focus-visible:outline-offset-2",
          error ? "border-arcade-red" : "border-ink",
        )}
      />
    </div>
  );

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={d.setup.rules.tone}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {toneOptions.map((opt) => {
          const selected = value === opt.id;
          const isUnhinged = opt.id === "unhinged";
          return (
            <button
              // The shake nonce is in the unhinged chip's key so re-selecting it
              // remounts the node and replays the one-shot shake animation.
              key={isUnhinged ? `unhinged-${shakeNonce}` : opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => handleToneClick(opt.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-btn border-3 px-2.5 py-2 text-sm font-bold transition",
                "focus-visible:outline-3 focus-visible:outline-offset-2",
                disabled && !selected && "cursor-not-allowed opacity-50",
                disabled && selected && "cursor-not-allowed",
                // The secret chip drops in full-width with danger styling + an
                // angry rattle each time it unlocks or is (re)selected (nonce>0
                // so it doesn't rattle on a passive page load when already
                // unlocked).
                isUnhinged && "col-span-2 justify-center uppercase tracking-wide sm:col-span-4",
                isUnhinged && shakeNonce > 0 && "animate-shake",
                isUnhinged ? "border-arcade-red" : "border-ink",
                selected
                  ? isUnhinged
                    ? "bg-arcade-red text-white shadow-hard-sm"
                    : "bg-arcade-pink text-night shadow-hard-sm"
                  : cn(
                      "bg-surface",
                      !disabled &&
                        (isUnhinged
                          ? "text-arcade-red hover:bg-arcade-red hover:text-white"
                          : "hover:bg-arcade-yellow hover:text-night"),
                    ),
              )}
            >
              <span aria-hidden>{opt.emoji}</span>
              <span>{d.setup.tones[opt.id].label}</span>
            </button>
          );
        })}
      </div>

      {/* Free-text input(s) appear BELOW the grid so the chip row never reflows. */}
      {value === "custom" ? (
        <div className="mt-3 space-y-3">
          {!perFighter
            ? toneField({
                id: "custom-tone",
                label: d.setup.toneCustom.describe,
                value: customTone,
                onChange: onCustomToneChange,
              })
            : (
              <div className="grid gap-3 sm:grid-cols-2">
                {toneField({
                  id: "custom-tone-a",
                  label: d.setup.toneCustom.fighterTone(fighterALabel),
                  value: customToneA,
                  onChange: onCustomToneAChange,
                })}
                {toneField({
                  id: "custom-tone-b",
                  label: d.setup.toneCustom.fighterTone(fighterBLabel),
                  value: customToneB,
                  onChange: onCustomToneBChange,
                })}
              </div>
            )}

          <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-bold text-ink/70">
            <input
              type="checkbox"
              checked={perFighter}
              onChange={(e) => togglePerFighter(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-ink accent-arcade-purple"
            />
            {d.setup.toneCustom.perFighter}
          </label>

          {error ? (
            <p className="text-xs font-bold text-arcade-red">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
