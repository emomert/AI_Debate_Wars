"use client";

/**
 * JudgeSelector — the judge is MANDATORY (July 2026): every match ends with a
 * verdict. The user only chooses HOW the judge is picked — Auto (neutral model
 * resolved by the server) or a hand-picked third model — with warnings when
 * the pick isn't neutral. (`judge.enabled` stays in the config schema for
 * backward-compat; setup coerces it to true.)
 */

import { JUDGE_MODE_OPTIONS } from "@/lib/constants";
import { previewAutoJudge, type ModelCatalogEntry } from "@/lib/models/modelRegistry";
import type { JudgeConfig, JudgeMode, ModelRef } from "@/lib/debate/debateTypes";
import { Badge } from "@/components/game/Badge";
import { ModelSelector } from "@/components/setup/ModelSelector";
import type { ProviderAvailability } from "@/lib/state/ArenaContext";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

interface JudgeSelectorProps {
  value: JudgeConfig;
  onChange: (judge: JudgeConfig) => void;
  /** Model ids currently fighting — used to warn if the judge isn't neutral. */
  fighterModelIds?: string[];
  availability?: ProviderAvailability | null;
}

export function JudgeSelector({
  value,
  onChange,
  fighterModelIds = [],
  availability,
}: JudgeSelectorProps) {
  const d = useT();
  const setMode = (mode: JudgeMode) => {
    playSound("buttonClick");
    onChange({ ...value, enabled: true, mode });
  };

  const setThirdModel = (entry: ModelCatalogEntry) => {
    playSound("modelSelected");
    const model: ModelRef = { providerId: entry.providerId, modelId: entry.id };
    onChange({ ...value, enabled: true, mode: "thirdModel", model });
  };

  const warns = value.mode === "modelA" || value.mode === "modelB";

  const thirdMatchesFighter =
    value.mode === "thirdModel" &&
    !!value.model &&
    fighterModelIds.includes(value.model.modelId);

  // Which neutral model the "auto" judge will be — mirrors the server's pick so
  // the user sees it up front (#10). Null until /api/health resolves availability.
  const autoJudge =
    value.mode === "auto"
      ? previewAutoJudge(
          availability
            ? {
                openai: availability.openai,
                deepseek: availability.deepseek,
                openrouter: availability.openrouter,
              }
            : null,
          fighterModelIds,
        )
      : null;
  // Rare degenerate case (only fighters available on the one backend): the auto
  // pick is itself a fighter, so warn it's not fully neutral.
  const autoJudgeIsFighter = !!autoJudge && fighterModelIds.includes(autoJudge.id);

  return (
    <div>
      <p className="mb-3 text-sm text-ink/60">{d.setup.judge.mandatoryNote}</p>
      <div className="space-y-3">
          <div
            role="radiogroup"
            aria-label={d.setup.judge.typeLabel}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {JUDGE_MODE_OPTIONS.map((opt) => {
              const selected = value.mode === opt.id;
              const copy = d.setup.judge.modes[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMode(opt.id)}
                  className={cn(
                    "rounded-card border-3 border-ink p-3 text-left transition",
                    "focus-visible:outline-3 focus-visible:outline-offset-2",
                    selected
                      ? "bg-arcade-purple text-white shadow-hard-sm"
                      : "bg-surface hover:-translate-y-0.5 hover:shadow-hard-sm",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-sm font-extrabold">
                      {copy.label}
                    </span>
                    {opt.warns ? (
                      <Badge color="orange" size="sm">{d.setup.judge.lessNeutral}</Badge>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      selected ? "text-white/80" : "text-ink/60",
                    )}
                  >
                    {copy.blurb}
                  </p>
                </button>
              );
            })}
          </div>

          {warns ? (
            <p className="rounded-card border-3 border-arcade-orange bg-arcade-orange/15 p-3 text-sm font-semibold text-ink">
              {d.setup.judge.warnParticipated}
            </p>
          ) : null}

          {/* Auto Judge — reveal which neutral model will score the match (#10). */}
          {value.mode === "auto" ? (
            <div className="rounded-card border-3 border-dashed border-ink/40 bg-paper p-3">
              {autoJudge ? (
                <div className="flex items-start gap-2.5">
                  <span aria-hidden className="text-2xl leading-none">
                    {autoJudge.avatar}
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-extrabold">
                      {d.setup.judge.autoPickPrefix} {autoJudge.displayName}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        autoJudgeIsFighter
                          ? "font-semibold text-arcade-orange"
                          : "text-ink/60",
                      )}
                    >
                      {autoJudgeIsFighter
                        ? d.setup.judge.warnParticipated
                        : d.setup.judge.autoNeutralNote}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink/65">{d.setup.judge.autoResolving}</p>
              )}
            </div>
          ) : null}

          {value.mode === "thirdModel" ? (
            <div className="rounded-card border-3 border-dashed border-ink/40 bg-paper p-3">
              <ModelSelector
                label={d.setup.judge.judgeModelLabel}
                accent="purple"
                selectedId={value.model?.modelId ?? ""}
                onSelect={setThirdModel}
                availability={availability}
              />
              {thirdMatchesFighter ? (
                <p className="mt-3 rounded-card border-3 border-arcade-orange bg-arcade-orange/15 p-3 text-sm font-semibold text-ink">
                  {d.setup.judge.warnThirdFighting}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Always reassure: the judge scores blind — it never learns which
              model wrote which side (#12). */}
          <div className="rounded-card border-3 border-ink/15 bg-arcade-blue/10 p-3">
            <p className="font-heading text-sm font-extrabold">{d.setup.judge.blindTitle}</p>
            <p className="mt-0.5 text-xs text-ink/70">{d.setup.judge.blindNote}</p>
          </div>
      </div>
    </div>
  );
}
