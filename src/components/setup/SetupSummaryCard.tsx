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
import { ALL_TONE_OPTIONS } from "@/lib/constants";
import { COINS_ENABLED } from "@/lib/coins/config";
import { matchCoinCost } from "@/lib/coins/economy";
import { getBattlePairs } from "@/lib/debate/orchestrator";
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
  const pairs = getBattlePairs(config);
  // (matchCoinCost renders below only when COINS_ENABLED.)

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
  const toneEmoji = ALL_TONE_OPTIONS.find((t) => t.id === config.tone)?.emoji;
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

        {pairs.length === 1 ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-card border-3 border-night bg-white p-2.5 text-night">
              <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
                {d.setup.summary.fighterA}
              </p>
              {/* break-words, not truncate: the whole name must be readable
                  (owner 7/12 — "DeepSeek V4 …" hid which fighter was picked). */}
              <p className="break-words text-sm font-bold leading-tight text-arcade-blue">
                {config.modelA.displayName}
              </p>
            </div>
            <div className="rounded-card border-3 border-night bg-white p-2.5 text-night">
              <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
                {d.setup.summary.fighterB}
              </p>
              <p className="break-words text-sm font-bold leading-tight text-arcade-red">
                {config.modelB.displayName}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {pairs.map((p, i) => (
              <div
                key={i}
                className="rounded-card border-3 border-night bg-white p-2.5 text-night"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-night/50">
                  {d.setup.battles.battleLabel(i + 1)}
                </p>
                <p className="mt-0.5 break-words text-sm font-bold leading-tight">
                  <span className="text-arcade-blue">{p.modelA.displayName}</span>
                  <span className="text-night/40"> vs </span>
                  <span className="text-arcade-red">{p.modelB.displayName}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge color="white" size="sm">
            {config.mode === "blitz"
              ? d.setup.summary.badgeBlitz
              : config.mode === "debate"
                ? d.setup.summary.badgeDebate
                : d.setup.summary.badgeDiscussion}
          </Badge>
          {pairs.length > 1 ? (
            <Badge color="purple" size="sm">⚔️ {d.setup.battles.summaryCount(pairs.length)}</Badge>
          ) : null}
          {/* Rounds chip removed (owner, 7/12): every match is 3 rounds now, so
              "3 · Quick Match" was dead information. Blitz keeps its own badge
              (fixed 4 rounds / 8 turns) since its shape differs. */}
          {config.mode === "blitz" ? (
            <Badge color="white" size="sm">{d.setup.summary.blitzRounds}</Badge>
          ) : null}
          {COINS_ENABLED ? (
            // Total match price (multi-battle: each battle is priced + charged
            // on its own, so the card shows the sum across all pairs).
            <Badge color="coin" size="sm">
              {d.coins.matchCost(
                pairs.reduce(
                  (sum, p) =>
                    sum +
                    matchCoinCost({
                      modelAId: p.modelA.modelId,
                      modelBId: p.modelB.modelId,
                      deepDebate: config.deepDebate,
                      responseLength: config.responseLength,
                      judge: {
                        mode: config.judge.mode === "thirdModel" ? "thirdModel" : "auto",
                        modelId: config.judge.model?.modelId,
                      },
                    }),
                  0,
                ),
              )}
            </Badge>
          ) : null}
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

      {/* Desktop Start. On mobile the sticky bottom-bar CTA provides Start, so
          this one is hidden below lg — otherwise two identical Start buttons
          show on screen at once (the summary card's + the sticky bar's). */}
      <div className="hidden lg:block">
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
      </div>
    </div>
  );
}
