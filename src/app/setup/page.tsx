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
import { TopicInput } from "@/components/setup/TopicInput";
import { BattleList } from "@/components/setup/BattleList";
import { ToneSelector } from "@/components/setup/ToneSelector";
import { ResponseLengthSelector } from "@/components/setup/ResponseLengthSelector";
import { DeepDebateToggle } from "@/components/setup/DeepDebateToggle";
import { PaceSelector } from "@/components/setup/PaceSelector";
import { VoiceToggle } from "@/components/setup/VoiceToggle";
import { JudgeSelector } from "@/components/setup/JudgeSelector";
import { SetupSummaryCard } from "@/components/setup/SetupSummaryCard";

import { useArena, toSelectedModel, defaultFighters } from "@/lib/state/ArenaContext";
import { playSound } from "@/lib/audio/soundManager";
import { validateSetup } from "@/lib/debate/validators";
import { getBattlePairs } from "@/lib/debate/orchestrator";
import { blitzRosterModelIds, isBlitzModel } from "@/lib/debate/blitzRoster";
import { BLITZ_ENABLED } from "@/lib/debate/blitzConfig";
import { createId } from "@/lib/utils/ids";
import { TOPIC_MAX_LENGTH } from "@/lib/constants";
import { VOICE_ENABLED } from "@/lib/tts/config";
import {
  getModelById,
  modelIdSupportsLanguage,
  modelSupportsWebSearch,
  type ModelCatalogEntry,
} from "@/lib/models/modelRegistry";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { BattleFighters, DebateConfig } from "@/lib/debate/debateTypes";
import { MAX_BATTLES } from "@/lib/debate/debateTypes";

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
    // Battle #1 (primary modelA/modelB) — keep the "pick the other default if it
    // collides" behavior so the two fighters don't both fall back to the same id.
    if (!modelIdSupportsLanguage(config.modelA.modelId, locale)) {
      patch.modelA = toSelectedModel(config.modelB.modelId === a.id ? b : a, "blue");
    }
    if (!modelIdSupportsLanguage(config.modelB.modelId, locale)) {
      patch.modelB = toSelectedModel(config.modelA.modelId === b.id ? a : b, "red");
    }
    // Extra battles — swap any non-Turkish fighter for a Turkish-capable default.
    const extras = config.battles ?? [];
    let extrasChanged = false;
    const fixedExtras = extras.map((p) => {
      let modelA = p.modelA;
      let modelB = p.modelB;
      if (!modelIdSupportsLanguage(p.modelA.modelId, locale)) {
        modelA = toSelectedModel(a, "blue");
        extrasChanged = true;
      }
      if (!modelIdSupportsLanguage(p.modelB.modelId, locale)) {
        modelB = toSelectedModel(b, "red");
        extrasChanged = true;
      }
      return { modelA, modelB };
    });
    if (extrasChanged) patch.battles = fixedExtras;
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
  }, [locale, config.modelA.modelId, config.modelB.modelId, config.battles, config.judge.mode, config.judge.model?.modelId]);

  // Whether the server can run app-side web search (Deep Debate for
  // OpenAI/DeepSeek fighters); null until /api/health resolves → optimistic.
  const injectedSearchReady = availability ? availability.webSearch : null;

  const validation = validateSetup(config, { injectedSearchReady, locale });

  const topicTooLong = config.topic.trim().length > TOPIC_MAX_LENGTH;
  const topicError =
    attempted || topicTooLong ? validation.errors.topic : undefined;

  const pairs = getBattlePairs(config);
  // Deep Debate requires EVERY fighter across ALL battles to support web search.
  const fightersEligibleForDeep = pairs.every(
    (p) =>
      modelSupportsWebSearch(p.modelA.modelId, injectedSearchReady !== false) &&
      modelSupportsWebSearch(p.modelB.modelId, injectedSearchReady !== false),
  );

  // Matches are strictly 3 rounds (July 2026 — the 3/5/7 selector was removed).
  // Normalize so a config persisted before the change can't smuggle 5/7 into a
  // new match; old COMPLETED 5/7 sessions still render fine (engine unchanged).
  useEffect(() => {
    if (config.roundCount !== 3) setConfig({ roundCount: 3 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.roundCount]);

  // Deep Debate fixes the format further: standard serious tone (and the auto
  // length, handled below).
  useEffect(() => {
    if (config.deepDebate && config.tone !== "serious") {
      setConfig({ tone: "serious" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.deepDebate, config.tone]);

  const isBlitz = config.mode === "blitz";

  // Discussion mode is removed and Blitz is hidden behind BLITZ_ENABLED — allow
  // only debate (plus blitz when enabled); a persisted/stale config could still
  // carry "discussion" or "blitz".
  useEffect(() => {
    const allowed = config.mode === "debate" || (BLITZ_ENABLED && config.mode === "blitz");
    if (!allowed) setConfig({ mode: "debate" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mode]);

  // Blitz is a fixed-shape mode: auto pace, punchy length, no deep/multi-battle,
  // standard tone, and both fighters must come from the curated roster. Normalize
  // the config so entering Blitz can never leave a conflicting setting behind.
  useEffect(() => {
    if (!isBlitz) return;
    const patch: Partial<DebateConfig> = {};
    if (config.pace !== "auto") patch.pace = "auto";
    if (config.responseLength !== "punchy") patch.responseLength = "punchy";
    if (config.deepDebate) patch.deepDebate = false;
    if (config.tone !== "serious") patch.tone = "serious";
    if ((config.battles ?? []).length > 0) patch.battles = [];
    const roster = blitzRosterModelIds();
    if (!isBlitzModel(config.modelA.modelId)) {
      const pick = getModelById(roster[0]);
      if (pick) patch.modelA = toSelectedModel(pick, "blue");
    }
    if (!isBlitzModel(config.modelB.modelId)) {
      // Prefer a different roster model than A so the two fighters don't collide.
      const otherId = roster.find((id) => id !== (patch.modelA?.modelId ?? config.modelA.modelId)) ?? roster[0];
      const pick = getModelById(otherId);
      if (pick) patch.modelB = toSelectedModel(pick, "red");
    }
    if (Object.keys(patch).length > 0) setConfig(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlitz, config.pace, config.responseLength, config.deepDebate, config.tone, config.battles, config.modelA.modelId, config.modelB.modelId]);

  // The judge is MANDATORY (July 2026) and only neutral judges exist. Coerce
  // any persisted judge-off / "none" / "Model A/B judges" config to an enabled
  // Auto judge so every match ends with a verdict.
  useEffect(() => {
    const j = config.judge;
    const staleMode = j.mode === "none" || j.mode === "modelA" || j.mode === "modelB";
    if (!j.enabled || staleMode) {
      setConfig({
        judge: staleMode
          ? { enabled: true, mode: "auto", model: undefined }
          : { ...j, enabled: true },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.judge.mode, config.judge.enabled]);

  // Battle-list handlers. Battle #1 maps to modelA/modelB; battles #2–#3 live in
  // config.battles. Slot colors are kept (A blue, B red).
  const setPair = (index: number, pair: BattleFighters) => {
    if (index === 0) {
      setConfig({ modelA: pair.modelA, modelB: pair.modelB });
    } else {
      const extras = (config.battles ?? []).slice();
      extras[index - 1] = pair;
      setConfig({ battles: extras });
    }
  };

  const selectFighter = (index: number, slot: "A" | "B", entry: ModelCatalogEntry) => {
    const pair = pairs[index];
    setPair(
      index,
      slot === "A"
        ? { ...pair, modelA: toSelectedModel(entry, "blue") }
        : { ...pair, modelB: toSelectedModel(entry, "red") },
    );
  };

  const swapBattle = (index: number) => {
    playSound("buttonClick");
    const pair = pairs[index];
    setPair(index, {
      ...pair, // keep the row's stable uid so the swap doesn't remount it
      modelA: { ...pair.modelB, color: "blue" },
      modelB: { ...pair.modelA, color: "red" },
    });
  };

  const addBattle = () => {
    if (pairs.length >= MAX_BATTLES) return;
    playSound("modeSelect");
    const { a, b } = defaultFighters();
    const extras = (config.battles ?? []).slice();
    extras.push({
      uid: createId("battle"),
      modelA: toSelectedModel(a, "blue"),
      modelB: toSelectedModel(b, "red"),
    });
    setConfig({ battles: extras });
  };

  const removeBattle = (index: number) => {
    if (index <= 0) return;
    playSound("buttonClick");
    const extras = (config.battles ?? []).slice();
    extras.splice(index - 1, 1);
    setConfig({ battles: extras });
  };

  const handleStart = () => {
    setAttempted(true);
    if (!validateSetup(config, { injectedSearchReady, locale }).valid) return;
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
          {/* With Blitz hidden, Debate is the only mode — a one-option picker
              would be noise, so the whole panel goes away. */}
          {BLITZ_ENABLED ? (
          <GamePanel title="Mode">
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "debate" as const, emoji: "⚔️", title: "Debate", blurb: "Full match, 3–7 rounds, 56 fighters." },
                { id: "blitz" as const, emoji: "⚡", title: "Blitz", blurb: "Fast 8-turn stage battle. Curated roster." },
              ]).map((m) => {
                const active = config.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (config.mode === m.id) return;
                      playSound("modeSelect");
                      setConfig({ mode: m.id });
                    }}
                    className={
                      "flex flex-col items-start gap-1 rounded-card border-4 border-ink p-3 text-left shadow-hard transition-transform " +
                      (active ? "bg-arcade-yellow" : "bg-card hover:-translate-y-0.5")
                    }
                  >
                    <span className="font-display text-lg text-ink">
                      <span aria-hidden>{m.emoji}</span> {m.title}
                    </span>
                    <span className="text-xs text-ink/70">{m.blurb}</span>
                  </button>
                );
              })}
            </div>
          </GamePanel>
          ) : null}

          <GamePanel title={d.setup.sections.topic}>
            <TopicInput
              value={config.topic}
              onChange={(topic) => setConfig({ topic })}
              error={topicError}
              availability={availability}
            />
            {/* Deep Debate rides along inside the Topic section as a compact
                toggle — it's a per-match capability, not a full setup step. */}
            {isBlitz ? null : (
              <div className="mt-3">
                <DeepDebateToggle
                  compact
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
              </div>
            )}
          </GamePanel>

          <GamePanel title={d.setup.sections.fighters}>
            {config.deepDebate ? (
              <div className="mb-3 rounded-card border-3 border-arcade-purple bg-arcade-purple/10 p-3 text-sm font-semibold text-ink">
                {d.setup.fightersDeepNote}
              </div>
            ) : null}
            <BattleList
              pairs={pairs}
              availability={availability}
              requireWebSearch={config.deepDebate}
              onSelect={selectFighter}
              onSwap={swapBattle}
              onAdd={addBattle}
              onRemove={removeBattle}
              allowedModelIds={isBlitz ? blitzRosterModelIds() : undefined}
              allowAddBattle={!isBlitz}
            />
          </GamePanel>

          {isBlitz ? (
            <GamePanel title={d.setup.sections.rules}>
              <p className="text-sm text-ink/70">
                <span aria-hidden>⚡</span> Blitz is fixed: 4 fast rounds (8 turns),
                punchy one-liners, auto pace, with an in-scene verdict. Just pick your
                topic and two fighters.
              </p>
            </GamePanel>
          ) : (
          <GamePanel title={d.setup.sections.rules}>
            {/* Rounds are fixed at 3 (July 2026) — the 3/5/7 selector is gone. */}
            <div className="space-y-5">
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
                  customToneA={config.customToneA ?? ""}
                  onCustomToneAChange={(customToneA) => setConfig({ customToneA })}
                  customToneB={config.customToneB ?? ""}
                  onCustomToneBChange={(customToneB) => setConfig({ customToneB })}
                  fighterALabel={pairs.length > 1 ? d.setup.fighterA : config.modelA.displayName}
                  fighterBLabel={pairs.length > 1 ? d.setup.fighterB : config.modelB.displayName}
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
              {VOICE_ENABLED ? (
                <div>
                  <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                    {d.setup.rules.voice}
                  </p>
                  <VoiceToggle />
                </div>
              ) : null}
            </div>
          </GamePanel>
          )}

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
              availability={availability}
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
