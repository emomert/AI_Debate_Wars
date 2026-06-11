"use client";

/**
 * VoiceToggle — fighter voices on/off, set during match setup (docs/21).
 * Backed by the same persisted voicePlayer flag as the arena HUD chip, so
 * the two controls always agree (and the choice survives across matches).
 */

import { useEffect, useState } from "react";

import { voicePlayer } from "@/lib/tts/voicePlayer";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

export function VoiceToggle() {
  const d = useT();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(voicePlayer.hydrate());
    return voicePlayer.subscribeEnabled(setEnabled);
  }, []);

  const options = [
    { on: false, emoji: "🔇", copy: d.setup.voice.off },
    { on: true, emoji: "🔊", copy: d.setup.voice.on },
  ];

  return (
    <div role="radiogroup" aria-label={d.setup.rules.voice} className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const selected = enabled === opt.on;
        return (
          <button
            key={String(opt.on)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              playSound("buttonClick");
              voicePlayer.setEnabled(opt.on);
            }}
            className={cn(
              "rounded-card border-4 border-ink p-3 text-left transition",
              "focus-visible:outline-3 focus-visible:outline-offset-2",
              selected
                ? "-translate-y-0.5 bg-arcade-green text-night shadow-hard"
                : "bg-surface shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard",
            )}
          >
            <div className="font-heading text-base font-extrabold">
              <span aria-hidden className="mr-1.5">{opt.emoji}</span>
              {opt.copy.label}
            </div>
            <div className={cn("text-xs", selected ? "text-night/70" : "text-ink/55")}>
              {opt.copy.blurb}
            </div>
          </button>
        );
      })}
    </div>
  );
}
