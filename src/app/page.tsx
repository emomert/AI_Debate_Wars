"use client";

/**
 * Home — the game start screen (docs/02, docs/09). Hero, topic input, sample
 * topics and the two primary CTAs: start a match (→ setup) or try a ready-made
 * sample debate (→ straight into the arena).
 */

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { FloatingBadge } from "@/components/game/FloatingBadge";
import { Badge } from "@/components/game/Badge";
import { TopicInput } from "@/components/setup/TopicInput";
import { MODE_OPTIONS } from "@/lib/constants";
import { useArena, toSelectedModel } from "@/lib/state/ArenaContext";
import { playSound } from "@/lib/audio/soundManager";
import { createDebateSession } from "@/lib/debate/orchestrator";
import { getModelById, MODEL_CATALOG } from "@/lib/models/modelRegistry";
import type { DebateConfig } from "@/lib/debate/debateTypes";

function sampleConfig(): DebateConfig {
  // A quick cheap matchup for "Try a Sample".
  const a = getModelById("gpt-4o-mini") ?? MODEL_CATALOG[0];
  const b = getModelById("deepseek-v4-flash") ?? MODEL_CATALOG[1];
  return {
    topic: "Should universities ban AI tools?",
    mode: "debate",
    modelA: toSelectedModel(a, "blue"),
    modelB: toSelectedModel(b, "red"),
    roundCount: 3,
    tone: "casual",
    responseLength: "medium",
    pace: "auto",
    judge: { enabled: true, mode: "auto" },
  };
}

export default function HomePage() {
  const router = useRouter();
  const { config, setConfig, setSession } = useArena();

  const startMatch = () => router.push("/setup");

  const trySample = () => {
    const sample = sampleConfig();
    setConfig(sample);
    setSession(createDebateSession(sample));
    playSound("debateStart");
    router.push("/debate");
  };

  return (
    <GameShell>
      {/* Hero */}
      <section className="relative pt-2 text-center">
        <div className="mb-4 flex justify-center">
          <FloatingBadge color="pink" rotate={-4}>
            🕹️ v0 · Arcade Beta
          </FloatingBadge>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mx-auto max-w-3xl font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl"
        >
          Make AIs Fight
          <br />
          <span className="text-arcade-purple">Your Ideas</span>
        </motion.h1>

        <p className="mx-auto mt-4 max-w-xl text-base text-ink/70 sm:text-lg">
          Pick a topic, choose two models, set the rules, and watch the debate
          unfold in a browser-game arena.
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Badge color="yellow" size="sm">⚔️ Debate or 🧠 Discussion</Badge>
          <Badge color="green" size="sm">3 / 5 / 7 rounds</Badge>
          <Badge color="purple" size="sm">⚖️ Optional judge</Badge>
          <Badge color="white" size="sm">💰 Live cost tracking</Badge>
        </div>
      </section>

      {/* Topic + CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
        className="mx-auto mt-8 max-w-2xl"
      >
        <GamePanel padding="lg">
          <TopicInput
            value={config.topic}
            onChange={(topic) => setConfig({ topic })}
          />
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <ArcadeButton
              variant="primary-green"
              size="lg"
              fullWidth
              onClick={startMatch}
              rightIcon={<span aria-hidden>▶</span>}
            >
              Start Match
            </ArcadeButton>
            <ArcadeButton
              variant="primary-yellow"
              size="lg"
              fullWidth
              onClick={trySample}
            >
              🎲 Try a Sample
            </ArcadeButton>
          </div>
        </GamePanel>
      </motion.div>

      {/* Mode preview */}
      <section className="mx-auto mt-8 max-w-3xl">
        <h2 className="mb-3 text-center font-heading text-xl font-extrabold">
          Two ways to play
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODE_OPTIONS.map((opt) => (
            <GamePanel key={opt.id} padding="md" className="bg-white">
              <p className="font-heading text-lg font-extrabold">
                <span aria-hidden className="mr-1.5 text-2xl">{opt.emoji}</span>
                {opt.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink/70">{opt.tagline}</p>
              <p className="mt-2 text-sm text-ink/60">{opt.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge color="blue" size="sm">A · {opt.modelARole}</Badge>
                <Badge color="red" size="sm">B · {opt.modelBRole}</Badge>
              </div>
            </GamePanel>
          ))}
        </div>
      </section>
    </GameShell>
  );
}
