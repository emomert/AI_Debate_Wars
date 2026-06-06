"use client";

/**
 * SetupSummaryCard — sticky recap of the configured match plus the primary
 * "Start the match" action. The start button stays disabled until the config
 * validates (docs/14 "start button disabled until valid").
 */

import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import type { DebateConfig } from "@/lib/debate/debateTypes";
import type { ValidationResult } from "@/lib/debate/validators";
import { ROUND_OPTIONS, TONE_OPTIONS } from "@/lib/constants";

interface SetupSummaryCardProps {
  config: DebateConfig;
  validation: ValidationResult;
  onStart: () => void;
}

export function SetupSummaryCard({
  config,
  validation,
  onStart,
}: SetupSummaryCardProps) {
  const roundLabel = ROUND_OPTIONS.find((r) => r.count === config.roundCount)?.label;
  const tone = TONE_OPTIONS.find((t) => t.id === config.tone);
  const errorList = Object.values(validation.errors);

  // Solid yellow panel: constant `night` text in both themes; inner cards stay
  // literal white so the match card reads like a printed ticket.
  return (
    <div className="rounded-panel border-4 border-ink bg-arcade-yellow p-4 text-night shadow-hard sm:p-5">
      <h2 className="font-heading text-xl font-extrabold sm:text-2xl">
        🎮 Match Card
      </h2>

      <div className="mt-3 space-y-3">
        <div className="rounded-card border-3 border-night bg-white p-3 text-night">
          <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
            Topic
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold">
            {config.topic.trim() || "—"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-card border-3 border-night bg-white p-2.5 text-night">
            <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
              Fighter A
            </p>
            <p className="truncate text-sm font-bold text-arcade-blue">
              {config.modelA.displayName}
            </p>
          </div>
          <div className="rounded-card border-3 border-night bg-white p-2.5 text-night">
            <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
              Fighter B
            </p>
            <p className="truncate text-sm font-bold text-arcade-red">
              {config.modelB.displayName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge color="white" size="sm">
            {config.mode === "debate" ? "⚔️ Debate" : "🧠 Discussion"}
          </Badge>
          <Badge color="white" size="sm">{config.roundCount} · {roundLabel}</Badge>
          <Badge color="white" size="sm">{tone?.emoji} {tone?.label}</Badge>
          <Badge color="white" size="sm">{config.responseLength}</Badge>
          <Badge color="blue" size="sm">
            {config.pace === "auto" ? "⚡ Fast" : "🚶 Normal"}
          </Badge>
          <Badge color={config.judge.enabled ? "purple" : "white"} size="sm">
            {config.judge.enabled ? "⚖️ Judge on" : "No judge"}
          </Badge>
        </div>
      </div>

      {errorList.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-card border-3 border-night bg-white p-3 text-night">
          {errorList.map((err) => (
            <li key={err} className="text-xs font-bold text-arcade-red">
              • {err}
            </li>
          ))}
        </ul>
      ) : null}

      <ArcadeButton
        variant="primary-green"
        size="lg"
        fullWidth
        className="mt-4"
        disabled={!validation.valid}
        onClick={onStart}
      >
        ▶ Start the Match
      </ArcadeButton>
      <p className="mt-2 text-center text-[11px] text-night/55">
        Live models · OpenRouter brands are free with a key
      </p>
    </div>
  );
}
