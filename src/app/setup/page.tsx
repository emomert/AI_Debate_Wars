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
import { ModelSelector } from "@/components/setup/ModelSelector";
import { RoundSelector } from "@/components/setup/RoundSelector";
import { ToneSelector } from "@/components/setup/ToneSelector";
import { ResponseLengthSelector } from "@/components/setup/ResponseLengthSelector";
import { DeepDebateToggle } from "@/components/setup/DeepDebateToggle";
import { PaceSelector } from "@/components/setup/PaceSelector";
import { JudgeSelector } from "@/components/setup/JudgeSelector";
import { SetupSummaryCard } from "@/components/setup/SetupSummaryCard";

import { useArena, toSelectedModel } from "@/lib/state/ArenaContext";
import { playSound } from "@/lib/audio/soundManager";
import { validateSetup } from "@/lib/debate/validators";
import { TOPIC_MAX_LENGTH } from "@/lib/constants";
import { modelSupportsWebSearch } from "@/lib/models/modelRegistry";

export default function SetupPage() {
  const router = useRouter();
  const { config, setConfig, startMatch, availability } = useArena();
  const [attempted, setAttempted] = useState(false);

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
          Set Up Your Match
        </h1>
        <p className="mt-1 text-ink/65">
          Choose your fighters and set the rules. The arena handles the rest.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Config sections */}
        <div className="space-y-5">
          <GamePanel title="1 · Topic">
            <TopicInput
              value={config.topic}
              onChange={(topic) => setConfig({ topic })}
              error={topicError}
            />
          </GamePanel>

          <GamePanel title="2 · Deep Debate">
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

          <GamePanel title="3 · Choose Your Fighters">
            <div className="grid gap-5 sm:grid-cols-2">
              <ModelSelector
                label="Fighter A"
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
                label="Fighter B"
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
            <div className="mt-3 flex justify-center">
              <ArcadeButton variant="neutral-white" size="sm" onClick={swapFighters}>
                ⇄ Swap A ↔ B
              </ArcadeButton>
            </div>
          </GamePanel>

          <GamePanel title="4 · Match Rules">
            <div className="space-y-5">
              <div>
                <p className="mb-2 flex items-center gap-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  Rounds
                  {config.deepDebate ? (
                    <span className="rounded-badge border-2 border-ink bg-arcade-purple px-1.5 py-0.5 text-[10px] text-white">
                      🔒 3 in Deep Debate
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
                  Tone
                  {config.deepDebate ? (
                    <span className="rounded-badge border-2 border-ink bg-arcade-purple px-1.5 py-0.5 text-[10px] text-white">
                      🔒 Standard
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
                  Max response length
                  {config.deepDebate ? (
                    <span className="rounded-badge border-2 border-ink bg-arcade-purple px-1.5 py-0.5 text-[10px] text-white">
                      🔒 Auto
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
                    Deep Debate uses a structured, longer format — length is set
                    for you, and turns take longer.
                  </p>
                ) : null}
              </div>
              <div>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  Pacing
                </p>
                <PaceSelector
                  value={config.pace}
                  onChange={(pace) => setConfig({ pace })}
                />
              </div>
            </div>
          </GamePanel>

          <GamePanel title="5 · Judge">
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
                ← Back to home
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
          Start the Match
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
