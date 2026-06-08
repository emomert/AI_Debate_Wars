"use client";

/**
 * Home — the game start screen (docs/02, docs/09). Focused pitch: what Debator
 * is, how a match works, example topics (display only — the actual topic is
 * written on the Setup screen) and two CTAs: "Use Debator" (→ setup) or
 * "Try a Sample" (→ straight into a ready-made arena match).
 */

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { FloatingBadge } from "@/components/game/FloatingBadge";
import { Badge } from "@/components/game/Badge";
import { getSampleTopics, TONE_OPTIONS } from "@/lib/constants";
import {
  useArena,
  toSelectedModel,
  defaultFighters,
  type ProviderAvailability,
} from "@/lib/state/ArenaContext";
import { playSound } from "@/lib/audio/soundManager";
import { createDebateSession } from "@/lib/debate/orchestrator";
import { readClientLocale, type Locale } from "@/lib/i18n/config";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import {
  MODEL_CATALOG,
  type ModelCatalogEntry,
} from "@/lib/models/modelRegistry";
import type { DebateConfig } from "@/lib/debate/debateTypes";

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Candidate fighters for the demo: free/low-cost models only (a sample must
 * never burn real credits), filtered to backends that actually have keys.
 * Until /api/health resolves, OpenRouter models are excluded to stay safe.
 */
function samplePool(availability: ProviderAvailability | null): ModelCatalogEntry[] {
  return MODEL_CATALOG.filter(
    (m) =>
      (m.costTier === "free" || m.costTier === "low") &&
      (availability ? availability[m.providerId] : m.providerId !== "openrouter"),
  );
}

/** A fresh randomized matchup every click — topic, tone and fighters. */
function sampleConfig(
  availability: ProviderAvailability | null,
  locale: Locale,
): DebateConfig {
  const pool = samplePool(availability);
  const fallback = defaultFighters(); // shared default pair (no duplicated ids)

  const a = pool.length >= 2 ? randomItem(pool) : fallback.a;
  const rest = pool.filter((m) => m.id !== a.id);
  const b = rest.length > 0 ? randomItem(rest) : fallback.b;

  // Avoid the "custom" tone in samples — it needs user-typed text.
  const presetTones = TONE_OPTIONS.filter((t) => t.id !== "custom");
  return {
    topic: randomItem(getSampleTopics(locale)),
    mode: "debate",
    modelA: toSelectedModel(a, "blue"),
    modelB: toSelectedModel(b, "red"),
    roundCount: 3, // demos stay quick & cheap
    tone: randomItem(presetTones).id,
    customTone: "",
    deepDebate: false, // a sample never spends web-search credits
    responseLength: randomItem(["short", "medium"] as const),
    pace: "auto",
    judge: { enabled: true, mode: "auto" },
  };
}

/** Emojis for the "How it works" steps; titles/bodies come from the dictionary. */
const HOW_IT_WORKS_EMOJI = ["📝", "🎚️", "🍿"] as const;

export default function HomePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { setConfig, setSession, availability } = useArena();
  const d = useT();
  const { locale } = useLocale();
  const sampleTopics = getSampleTopics(locale);

  // Consistent staggered fade-up so every section animates in on load.
  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: "easeOut" as const },
  });

  const useDebator = () => router.push("/setup");

  const trySample = () => {
    const sample = sampleConfig(availability, locale);
    setConfig(sample);
    setSession(createDebateSession({ ...sample, language: readClientLocale() }));
    playSound("debateStart");
    router.push("/debate");
  };

  return (
    <GameShell>
      {/* Hero */}
      <section className="relative pt-2 text-center">
        <motion.div {...fade(0)} className="mb-4 flex justify-center">
          <FloatingBadge color="pink" rotate={-4}>
            {d.home.hero.badge}
          </FloatingBadge>
        </motion.div>

        <motion.h1
          {...fade(0.06)}
          className="mx-auto max-w-3xl font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl"
        >
          {d.home.hero.titleLine1}
          <br />
          <span className="text-arcade-purple">{d.home.hero.titleLine2}</span>
        </motion.h1>

        <motion.p
          {...fade(0.12)}
          className="mx-auto mt-4 max-w-2xl text-base text-ink/70 sm:text-lg"
        >
          {d.home.hero.introBefore}
          <strong>{d.home.hero.introStrong}</strong>
          {d.home.hero.introAfter}
        </motion.p>

        <motion.div {...fade(0.18)} className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Badge color="yellow" size="sm">{d.home.hero.badges.fighters}</Badge>
          <Badge color="green" size="sm">{d.home.hero.badges.rounds}</Badge>
          <Badge color="purple" size="sm">{d.home.hero.badges.judge}</Badge>
          <Badge color="white" size="sm">{d.home.hero.badges.cost}</Badge>
        </motion.div>
      </section>

      {/* Primary CTAs */}
      <motion.div {...fade(0.24)} className="mx-auto mt-8 max-w-2xl">
        <GamePanel padding="lg">
          <div className="flex flex-col gap-2 sm:flex-row">
            <ArcadeButton
              variant="primary-green"
              size="lg"
              fullWidth
              onClick={useDebator}
              rightIcon={<span aria-hidden>▶</span>}
            >
              {d.home.cta.useDebator}
            </ArcadeButton>
            <ArcadeButton
              variant="primary-yellow"
              size="lg"
              fullWidth
              onClick={trySample}
            >
              {d.home.cta.trySample}
            </ArcadeButton>
          </div>
          <p className="mt-3 text-center text-xs text-ink/55">
            <strong>{d.home.cta.noteUseStrong}</strong>
            {d.home.cta.noteMiddle}
            <strong>{d.home.cta.noteSampleStrong}</strong>
            {d.home.cta.noteAfter}
          </p>
        </GamePanel>
      </motion.div>

      {/* How it works */}
      <motion.section {...fade(0.3)} className="mx-auto mt-10 max-w-4xl">
        <h2 className="mb-3 text-center font-heading text-xl font-extrabold">
          {d.home.howItWorks.heading}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {d.home.howItWorks.steps.map((step, i) => (
            <GamePanel key={step.title} padding="md">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-btn border-3 border-ink bg-arcade-yellow font-mono text-sm font-bold text-night">
                  {i + 1}
                </span>
                <span aria-hidden className="text-2xl">{HOW_IT_WORKS_EMOJI[i]}</span>
              </div>
              <p className="mt-2 font-heading text-base font-extrabold">
                {step.title}
              </p>
              <p className="mt-1 text-sm text-ink/65">{step.body}</p>
            </GamePanel>
          ))}
        </div>
      </motion.section>

      {/* Example topics — display only; the topic is written on the Setup screen */}
      <motion.section {...fade(0.36)} className="mx-auto mt-10 max-w-3xl text-center">
        <h2 className="mb-1 font-heading text-xl font-extrabold">
          {d.home.examples.heading}
        </h2>
        <p className="mb-3 text-sm text-ink/60">
          {d.home.examples.subtitle}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {sampleTopics.map((topic) => (
            <span
              key={topic}
              className="rounded-badge border-3 border-ink bg-surface px-2.5 py-1 text-xs font-semibold"
            >
              {topic}
            </span>
          ))}
        </div>
      </motion.section>
    </GameShell>
  );
}
