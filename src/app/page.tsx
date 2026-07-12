"use client";

/**
 * Home — the game start screen (docs/02, docs/09). Focused pitch: what Debator
 * is, how a match works, example topics (display only — the actual topic is
 * written on the Setup screen) and two CTAs: "Use Debator" (→ setup) or
 * "See a Demo" (→ a full-screen ~30s replay of a real recorded match; costs
 * nothing to watch — it replaced the old randomized "Try a Sample" live match).
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { FloatingBadge } from "@/components/game/FloatingBadge";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import { getSampleTopics, pickSampleTopics } from "@/lib/constants";
import { playSound } from "@/lib/audio/soundManager";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";

// The demo overlay only loads when someone actually presses "See a Demo".
const DemoOverlay = dynamic(
  () => import("@/components/demo/DemoOverlay").then((m) => m.DemoOverlay),
  { ssr: false },
);

/** Emojis for the "How it works" steps; titles/bodies come from the dictionary. */
const HOW_IT_WORKS_EMOJI = ["📝", "🎚️", "🍿"] as const;

export default function HomePage() {
  const router = useRouter();
  const reduce = useReduceMotion();
  const d = useT();
  const { locale } = useLocale();
  const [demoOpen, setDemoOpen] = useState(false);
  // Home shows a bigger, freshly-shuffled spread of examples each visit
  // (SSR-stable initial slice, reshuffled on mount to avoid a hydration mismatch).
  const [sampleTopics, setSampleTopics] = useState<string[]>(() =>
    getSampleTopics(locale).slice(0, 14),
  );
  useEffect(() => {
    setSampleTopics(pickSampleTopics(locale, 14));
  }, [locale]);

  // Consistent staggered fade-up so every section animates in on load.
  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: "easeOut" as const },
  });

  const useDebator = () => {
    playSound("buttonClick");
    router.push("/setup");
  };

  const seeDemo = () => {
    playSound("buttonClick");
    setDemoOpen(true);
  };

  return (
    <GameShell>
      {demoOpen ? <DemoOverlay onClose={() => setDemoOpen(false)} /> : null}
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
      </section>

      {/* Primary CTAs */}
      <motion.div {...fade(0.18)} className="mx-auto mt-8 max-w-2xl">
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
            <ArcadeButton variant="neutral-white" size="lg" fullWidth onClick={seeDemo}>
              {d.home.cta.seeDemo}
            </ArcadeButton>
          </div>
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
