"use client";

/**
 * Setup — configure the match like a game lobby (docs/09). Left: the config
 * sections. Right: a sticky match card with the Start action that stays
 * disabled until the config validates.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { TopicInput } from "@/components/setup/TopicInput";
import { ModeSelector } from "@/components/setup/ModeSelector";
import { ModelSelector } from "@/components/setup/ModelSelector";
import { RoundSelector } from "@/components/setup/RoundSelector";
import { ToneSelector } from "@/components/setup/ToneSelector";
import { ResponseLengthSelector } from "@/components/setup/ResponseLengthSelector";
import { PaceSelector } from "@/components/setup/PaceSelector";
import { JudgeSelector } from "@/components/setup/JudgeSelector";
import { SetupSummaryCard } from "@/components/setup/SetupSummaryCard";

import { useArena, toSelectedModel } from "@/lib/state/ArenaContext";
import { playSound } from "@/lib/audio/soundManager";
import { validateSetup } from "@/lib/debate/validators";
import { TOPIC_MAX_LENGTH } from "@/lib/constants";

export default function SetupPage() {
  const router = useRouter();
  const { config, setConfig, startMatch, availability } = useArena();
  const [attempted, setAttempted] = useState(false);

  const liveMode = Boolean(
    availability?.openai || availability?.deepseek || availability?.openrouter,
  );

  const validation = validateSetup(config);

  const topicTooLong = config.topic.trim().length > TOPIC_MAX_LENGTH;
  const topicError =
    attempted || topicTooLong ? validation.errors.topic : undefined;

  const handleStart = () => {
    setAttempted(true);
    if (!validateSetup(config).valid) return;
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

          <GamePanel title="2 · Mode">
            <ModeSelector
              value={config.mode}
              onChange={(mode) => setConfig({ mode })}
            />
          </GamePanel>

          <GamePanel title="3 · Choose Your Fighters">
            <p className="mb-3 rounded-card border-3 border-dashed border-ink/40 bg-paper p-2.5 text-xs text-ink/65">
              {liveMode
                ? "🟢 Models marked “ready” will make real API calls. OpenRouter brands (Qwen, Llama, …) are free with an OPENROUTER_API_KEY."
                : "🔑 No API keys detected. Add OPENAI_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY (free models!) to your .env.local to run a debate."}
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <ModelSelector
                label="Fighter A"
                accent="blue"
                selectedId={config.modelA.modelId}
                conflictId={config.modelB.modelId}
                availability={availability}
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
                onSelect={(entry) =>
                  setConfig({ modelB: toSelectedModel(entry, "red") })
                }
              />
            </div>
          </GamePanel>

          <GamePanel title="4 · Match Rules">
            <div className="space-y-5">
              <div>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  Rounds
                </p>
                <RoundSelector
                  value={config.roundCount}
                  onChange={(roundCount) => setConfig({ roundCount })}
                />
              </div>
              <div>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  Tone
                </p>
                <ToneSelector
                  value={config.tone}
                  onChange={(tone) => setConfig({ tone })}
                />
              </div>
              <div>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  Max response length
                </p>
                <ResponseLengthSelector
                  value={config.responseLength}
                  onChange={(responseLength) => setConfig({ responseLength })}
                />
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
          <div className="lg:sticky lg:top-[96px]">
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
