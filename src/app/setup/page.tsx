"use client";

/**
 * Setup — configure the match like a game lobby (docs/09). Left: the config
 * sections. Right: a sticky match card with the Start action that stays
 * disabled until the config validates.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { IconButton } from "@/components/game/IconButton";
import { TopicInput } from "@/components/setup/TopicInput";
import { ModelSelector } from "@/components/setup/ModelSelector";
import { RoundSelector } from "@/components/setup/RoundSelector";
import { ToneSelector } from "@/components/setup/ToneSelector";
import { ResponseLengthSelector } from "@/components/setup/ResponseLengthSelector";
import { DeepDebateToggle } from "@/components/setup/DeepDebateToggle";
import { PaceSelector } from "@/components/setup/PaceSelector";
import { JudgeSelector } from "@/components/setup/JudgeSelector";
import { SetupSummaryCard } from "@/components/setup/SetupSummaryCard";

import { useArena, toSelectedModel, defaultFighters } from "@/lib/state/ArenaContext";
import { playSound } from "@/lib/audio/soundManager";
import { validateSetup } from "@/lib/debate/validators";
import { TOPIC_MAX_LENGTH } from "@/lib/constants";
import {
  modelIdSupportsLanguage,
  modelSupportsWebSearch,
} from "@/lib/models/modelRegistry";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { DebateConfig } from "@/lib/debate/debateTypes";

export default function SetupPage() {
  const router = useRouter();
  const { config, setConfig, startMatch, availability } = useArena();
  const { locale } = useLocale();
  const d = useT();
  const [attempted, setAttempted] = useState(false);

  // In Turkish mode, a fighter (or third-model judge) that can't speak fluent
  // Turkish is hidden from the picker — so if the persisted config still holds
  // one, swap it for a Turkish-capable default (and drop a non-Turkish judge to
  // Auto) so the match never starts with a model that can't run in Turkish.
  useEffect(() => {
    if (locale !== "tr") return;
    const patch: Partial<DebateConfig> = {};
    const { a, b } = defaultFighters();
    if (!modelIdSupportsLanguage(config.modelA.modelId, locale)) {
      patch.modelA = toSelectedModel(config.modelB.modelId === a.id ? b : a, "blue");
    }
    if (!modelIdSupportsLanguage(config.modelB.modelId, locale)) {
      patch.modelB = toSelectedModel(config.modelA.modelId === b.id ? a : b, "red");
    }
    if (
      config.judge.enabled &&
      config.judge.mode === "thirdModel" &&
      config.judge.model &&
      !modelIdSupportsLanguage(config.judge.model.modelId, locale)
    ) {
      patch.judge = { ...config.judge, mode: "auto", model: undefined };
    }
    if (Object.keys(patch).length > 0) setConfig(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, config.modelA.modelId, config.modelB.modelId, config.judge.mode, config.judge.model?.modelId]);

  // Whether the server can run app-side web search (Deep Debate for
  // OpenAI/DeepSeek fighters); null until /api/health resolves → optimistic.
  const injectedSearchReady = availability ? availability.webSearch : null;

  const validation = validateSetup(config, { injectedSearchReady });

  const topicTooLong = config.topic.trim().length > TOPIC_MAX_LENGTH;
  const topicError =
    attempted || topicTooLong ? validation.errors.topic : undefined;

  const fightersEligibleForDeep =
    modelSupportsWebSearch(config.modelA.modelId, injectedSearchReady !== false) &&
    modelSupportsWebSearch(config.modelB.modelId, injectedSearchReady !== false);

  // Deep Debate fixes the format: 3 rounds, standard serious tone (and the
  // auto length, handled below). Normalize here too so a config persisted
  // before these limits existed can't smuggle 5 rounds into a deep session.
  useEffect(() => {
    if (config.deepDebate && (config.roundCount !== 3 || config.tone !== "serious")) {
      setConfig({ roundCount: 3, tone: "serious" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.deepDebate, config.roundCount, config.tone]);

  // Discussion mode is removed for now — keep every new match in debate mode
  // (a persisted/stale config could still carry "discussion").
  useEffect(() => {
    if (config.mode !== "debate") setConfig({ mode: "debate" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mode]);

  // Swap which fighter is A vs B (keep slot colors: A blue, B red).
  const swapFighters = () => {
    playSound("buttonClick");
    setConfig({
      modelA: { ...config.modelB, color: "blue" },
      modelB: { ...config.modelA, color: "red" },
    });
  };

  const handleStart = () => {
    setAttempted(true);
    if (!validateSetup(config, { injectedSearchReady }).valid) return;
    playSound("debateStart");
    startMatch();
    router.push("/debate");
  };

  return (
    <GameShell wide>
      <div className="mb-5">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          {d.setup.heading}
        </h1>
        <p className="mt-1 text-ink/65">
          {d.setup.subheading}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Config sections */}
        <div className="space-y-5">
          <GamePanel title={d.setup.sections.topic}>
            <TopicInput
              value={config.topic}
              onChange={(topic) => setConfig({ topic })}
              error={topicError}
            />
          </GamePanel>

          <GamePanel title={d.setup.sections.deepDebate}>
            <DeepDebateToggle
              value={config.deepDebate}
              fightersEligible={fightersEligibleForDeep}
              onChange={(deepDebate) =>
                setConfig(
                  deepDebate
                    ? { deepDebate, roundCount: 3, tone: "serious" }
                    : { deepDebate },
                )
              }
            />
          </GamePanel>

          <GamePanel title={d.setup.sections.fighters}>
            <div className="mb-3 flex justify-end">
              <IconButton label={d.setup.swapFighters} onClick={swapFighters}>
                <span aria-hidden>⇄</span>
              </IconButton>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <ModelSelector
                label={d.setup.fighterA}
                accent="blue"
                selectedId={config.modelA.modelId}
                conflictId={config.modelB.modelId}
                availability={availability}
                requireWebSearch={config.deepDebate}
                onSelect={(entry) =>
                  setConfig({ modelA: toSelectedModel(entry, "blue") })
                }
              />
              <ModelSelector
                label={d.setup.fighterB}
                accent="red"
                selectedId={config.modelB.modelId}
                conflictId={config.modelA.modelId}
                availability={availability}
                requireWebSearch={config.deepDebate}
                onSelect={(entry) =>
                  setConfig({ modelB: toSelectedModel(entry, "red") })
                }
              />
            </div>
          </GamePanel>

          <GamePanel title={d.setup.sections.rules}>
            <div className="space-y-5">
              <div>
                <p className="mb-2 flex items-center gap-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  {d.setup.rules.rounds}
                  {config.deepDebate ? (
                    <span className="rounded-badge border-2 border-ink bg-arcade-purple px-1.5 py-0.5 text-[10px] text-white">
                      {d.setup.rules.lockRounds}
                    </span>
                  ) : null}
                </p>
                <RoundSelector
                  value={config.roundCount}
                  onChange={(roundCount) => setConfig({ roundCount })}
                  disabled={config.deepDebate}
                />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  {d.setup.rules.tone}
                  {config.deepDebate ? (
                    <span className="rounded-badge border-2 border-ink bg-arcade-purple px-1.5 py-0.5 text-[10px] text-white">
                      {d.setup.rules.lockStandard}
                    </span>
                  ) : null}
                </p>
                <ToneSelector
                  value={config.tone}
                  onChange={(tone) => setConfig({ tone })}
                  customTone={config.customTone ?? ""}
                  onCustomToneChange={(customTone) => setConfig({ customTone })}
                  error={attempted ? validation.errors.tone : undefined}
                  disabled={config.deepDebate}
                />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  {d.setup.rules.maxLength}
                  {config.deepDebate ? (
                    <span className="rounded-badge border-2 border-ink bg-arcade-purple px-1.5 py-0.5 text-[10px] text-white">
                      {d.setup.rules.lockAuto}
                    </span>
                  ) : null}
                </p>
                <ResponseLengthSelector
                  value={config.responseLength}
                  onChange={(responseLength) => setConfig({ responseLength })}
                  disabled={config.deepDebate}
                />
                {config.deepDebate ? (
                  <p className="mt-2 text-xs text-ink/55">
                    {d.setup.rules.deepLengthNote}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  {d.setup.rules.pacing}
                </p>
                <PaceSelector
                  value={config.pace}
                  onChange={(pace) => setConfig({ pace })}
                />
              </div>
            </div>
          </GamePanel>

          <GamePanel title={d.setup.sections.judge}>
            <JudgeSelector
              value={config.judge}
              onChange={(judge) => setConfig({ judge })}
              fighterModelIds={[config.modelA.modelId, config.modelB.modelId]}
              availability={availability}
            />
          </GamePanel>
        </div>

        {/* Sticky summary / start */}
        <aside>
          <div className="lg:sticky lg:top-[72px]">
            <SetupSummaryCard
              config={config}
              validation={validation}
              onStart={handleStart}
            />
            <div className="mt-3 text-center">
              <ArcadeButton
                variant="neutral-white"
                size="sm"
                onClick={() => router.push("/")}
              >
                {d.setup.backToHome}
              </ArcadeButton>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile sticky Start CTA — always reachable without scrolling past the
          whole form (docs/09 mobile UX). Desktop uses the sticky summary card. */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-4 border-t-4 border-ink bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <ArcadeButton
          variant="primary-green"
          size="lg"
          fullWidth
          disabled={!validation.valid}
          onClick={handleStart}
          rightIcon={<span aria-hidden>▶</span>}
        >
          {d.setup.start}
        </ArcadeButton>
        {!validation.valid ? (
          <p className="mt-1 text-center text-[11px] font-semibold text-arcade-red">
            {Object.values(validation.errors)[0]}
          </p>
        ) : null}
      </div>
    </GameShell>
  );
}
