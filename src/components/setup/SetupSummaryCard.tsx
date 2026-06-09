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
import { TONE_OPTIONS } from "@/lib/constants";
import { getModelById, previewAutoJudge } from "@/lib/models/modelRegistry";
import type { ProviderAvailability } from "@/lib/state/ArenaContext";
import { useT } from "@/lib/i18n/LocaleProvider";

interface SetupSummaryCardProps {
  config: DebateConfig;
  validation: ValidationResult;
  onStart: () => void;
  /** Which providers have keys — lets the card name the auto judge. */
  availability?: ProviderAvailability | null;
}

export function SetupSummaryCard({
  config,
  validation,
  onStart,
  availability,
}: SetupSummaryCardProps) {
  const d = useT();
  const roundLabel = d.setup.rounds[config.roundCount]?.label;

  // Name the judge in the match card: the chosen third model, or — for Auto —
  // the same neutral model the server will pick (previewAutoJudge). Falls back
  // to a generic label until availability resolves.
  const judgeModel = !config.judge.enabled
    ? null
    : config.judge.mode === "thirdModel" && config.judge.model
      ? getModelById(config.judge.model.modelId)
      : previewAutoJudge(
          availability
            ? {
                openai: availability.openai,
                deepseek: availability.deepseek,
                openrouter: availability.openrouter,
              }
            : null,
          [config.modelA.modelId, config.modelB.modelId],
        );
  const judgeBadge = !config.judge.enabled
    ? d.setup.summary.judgeOff
    : judgeModel
      ? `⚖️ ${judgeModel.displayName}`
      : d.setup.summary.judgeOn;
  const toneEmoji = TONE_OPTIONS.find((t) => t.id === config.tone)?.emoji;
  const perFighterTone =
    config.tone === "custom" &&
    Boolean((config.customToneA ?? "").trim() || (config.customToneB ?? "").trim());
  const toneLabel =
    config.tone === "custom"
      ? perFighterTone
        ? `✏️ ${d.setup.toneCustom.perFighterShort}`
        : `✏️ ${(config.customTone ?? "").trim() || d.setup.toneCustom.fallbackLabel}`
      : `${toneEmoji} ${d.setup.tones[config.tone]?.label}`;
  const errorList = Object.values(validation.errors);

  // Solid yellow panel: constant `night` text in both themes; inner cards stay
  // literal white so the match card reads like a printed ticket.
  return (
    <div className="rounded-panel border-4 border-ink bg-arcade-yellow p-4 text-night shadow-hard sm:p-5">
      <h2 className="font-heading text-xl font-extrabold sm:text-2xl">
        {d.setup.summary.title}
      </h2>

      <div className="mt-3 space-y-3">
        <div className="rounded-card border-3 border-night bg-white p-3 text-night">
          <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
            {d.setup.summary.topic}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold">
            {config.topic.trim() || "—"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-card border-3 border-night bg-white p-2.5 text-night">
            <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
              {d.setup.summary.fighterA}
            </p>
            <p className="truncate text-sm font-bold text-arcade-blue">
              {config.modelA.displayName}
            </p>
          </div>
          <div className="rounded-card border-3 border-night bg-white p-2.5 text-night">
            <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
              {d.setup.summary.fighterB}
            </p>
            <p className="truncate text-sm font-bold text-arcade-red">
              {config.modelB.displayName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge color="white" size="sm">
            {config.mode === "debate" ? d.setup.summary.badgeDebate : d.setup.summary.badgeDiscussion}
          </Badge>
          <Badge color="white" size="sm">{d.setup.summary.roundLine(config.roundCount, roundLabel ?? "")}</Badge>
          <Badge color="white" size="sm" className="max-w-[12rem] truncate">{toneLabel}</Badge>
          <Badge color="white" size="sm">
            {config.deepDebate ? d.setup.summary.deepTemplate : config.responseLength}
          </Badge>
          {config.deepDebate ? (
            <Badge color="purple" size="sm">{d.setup.summary.deepDebate}</Badge>
          ) : null}
          <Badge color="blue" size="sm">
            {config.pace === "auto" ? d.setup.summary.fast : d.setup.summary.normal}
          </Badge>
          <Badge
            color={config.judge.enabled ? "purple" : "white"}
            size="sm"
            className="max-w-[12rem] truncate"
          >
            {judgeBadge}
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
        {d.setup.summary.start}
      </ArcadeButton>
      <p className="mt-2 text-center text-[11px] text-night/55">
        {d.setup.summary.footnote}
      </p>
    </div>
  );
}
