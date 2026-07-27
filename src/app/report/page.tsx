"use client";

/**
 * /report — the living technical report.
 *
 * Everything here is rendered FROM the real source of truth: the prompt
 * builders, the model catalogue, the pricing table. The prompt playground
 * calls the same buildSystemPrompt/buildTurnPrompt/buildJudgePrompt the API
 * routes call, so what this page shows can never drift from what we actually
 * send to the models.
 */

import { useMemo, useState } from "react";
import Link from "next/link";

import { useT } from "@/lib/i18n/LocaleProvider";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { Badge } from "@/components/game/Badge";
import { DebateMessageCard } from "@/components/debate/DebateMessageCard";
import { SectionNav } from "@/components/report/SectionNav";
import { FlowDiagram } from "@/components/report/FlowDiagram";
import { FighterRoster } from "@/components/report/FighterRoster";
import { PricingExplorer } from "@/components/report/PricingExplorer";
import { RoundTimeline } from "@/components/report/RoundTimeline";
import { CostEstimator } from "@/components/report/CostEstimator";
import { BrandLogo } from "@/components/report/BrandLogo";

import {
  buildJudgePrompt,
  buildSystemPrompt,
  buildTurnPrompt,
} from "@/lib/debate/promptBuilder";
import { createDebateSession } from "@/lib/debate/orchestrator";
import { FALLBACK_PRICE, TTS_COST_USD_PER_1M_CHARS } from "@/lib/cost/pricing";
import { VOICE_ENABLED } from "@/lib/tts/config";
import { DEEP_SEARCH_COST_USD } from "@/lib/debate/citations";
import { TONE_OPTIONS } from "@/lib/constants";
import { defaultFighters, toSelectedModel } from "@/lib/state/ArenaContext";
import type {
  Citation,
  DebateConfig,
  DebateTone,
  ResponseLength,
} from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------- bits ---------------------------------- */

function PromptBlock({ label, text }: { label: string; text: string }) {
  const d = useT();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
          {label}
        </p>
        <div className="flex items-center gap-2 print:hidden">
          <span className="font-mono text-[10px] text-ink/40">
            {d.report.playground.tokensApprox(Math.round(text.length / 4))}
          </span>
          <button
            type="button"
            onClick={copy}
            className={cn(
              "rounded-btn border-2 border-ink px-2 py-0.5 text-[10px] font-extrabold transition",
              copied ? "bg-arcade-green text-night" : "bg-surface hover:bg-arcade-yellow hover:text-night",
            )}
          >
            {copied ? d.report.playground.copied : d.report.playground.copy}
          </button>
        </div>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-card border-3 border-ink bg-night p-3.5 font-mono text-[11px] leading-relaxed text-green-300 shadow-hard-sm">
        {text}
      </pre>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-btn border-3 border-ink px-2.5 py-1 text-xs font-extrabold transition",
        disabled && "cursor-not-allowed opacity-50",
        active ? "bg-arcade-pink text-night shadow-hard-sm" : "bg-surface",
        !disabled && !active && "hover:bg-arcade-yellow hover:text-night",
      )}
    >
      {children}
    </button>
  );
}

function Knob({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** Panel title with a copy-deep-link button (#anchor) next to it. */
function AnchorTitle({ id, title }: { id: string; title: string }) {
  const d = useT();
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {title}
      <button
        type="button"
        title={copied ? d.report.copyLink.copied : d.report.copyLink.title}
        aria-label={d.report.copyLink.title}
        onClick={() => {
          void navigator.clipboard?.writeText(
            `${window.location.origin}${window.location.pathname}#${id}`,
          );
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className={cn(
          "rounded-btn border-2 px-1.5 text-sm font-bold transition print:hidden",
          copied
            ? "border-ink bg-arcade-green text-night"
            : "border-ink/30 text-ink/40 hover:border-ink hover:text-ink",
        )}
      >
        {copied ? "✓" : "#"}
      </button>
    </span>
  );
}

/* ------------------------------ sample sources ----------------------------- */

// Realistic stand-ins so the deep-mode prompt preview shows the EXACT block
// shape the server injects (the real ones come from Brave at request time).
// Real authoritative pages so the now-clickable citation chips lead somewhere
// meaningful rather than to placeholder URLs.
const SAMPLE_SOURCES: Citation[] = [
  {
    index: 1,
    title: "Ofcom — Online safety and protecting children",
    url: "https://www.ofcom.org.uk/online-safety/",
    quote:
      "New efforts to mandate age verification for social media platforms could reshape how minors access online services.",
  },
  {
    index: 2,
    title: "GDPR.eu — Children's data and parental consent",
    url: "https://gdpr.eu/",
    quote:
      "In the EU, the GDPR prohibits the online processing of children's data without parental consent.",
  },
];

/* ---------------------------------- page ---------------------------------- */

export default function ReportPage() {
  const d = useT();
  // Prompt playground state — mirrors the real Setup rules (deep locks
  // rounds to 3, tone to serious, length to the fixed template).
  const [topic, setTopic] = useState("Should social media platforms verify user age?");
  const [tone, setTone] = useState<DebateTone>("serious");
  const [customTone, setCustomTone] = useState("like an excited sports commentator");
  // Response length is strictly "short" (July 2026 — the setup picker was
  // removed, persisted configs coerce). Fixed here too so this page mirrors the
  // REAL setup rules, exactly like the 3-round lock below.
  const length: ResponseLength = "short";
  const [deep, setDeep] = useState(false);
  const [turnIdx, setTurnIdx] = useState(0);
  const [showJudge, setShowJudge] = useState(false);

  const effectiveTone = deep ? "serious" : tone;
  // Matches are strictly 3 rounds (July 2026) — mirrored here, not configurable.
  const effectiveRounds = 3;

  const session = useMemo(() => {
    const { a, b } = defaultFighters();
    const config: DebateConfig = {
      topic: topic.trim() || "Should social media platforms verify user age?",
      mode: "debate",
      modelA: toSelectedModel(a, "blue"),
      modelB: toSelectedModel(b, "red"),
      roundCount: effectiveRounds,
      tone: effectiveTone,
      customTone,
      deepDebate: deep,
      responseLength: length,
      pace: "manual",
      judge: { enabled: true, mode: "auto" },
    };
    return createDebateSession(config);
  }, [topic, effectiveTone, customTone, length, effectiveRounds, deep]);

  const fighterTurns = session.turns.filter((t) => t.speaker !== "judge");
  const turn = fighterTurns[Math.min(turnIdx, fighterTurns.length - 1)];
  const systemPrompt = buildSystemPrompt("debate", deep);
  const turnPrompt = buildTurnPrompt(session, turn, deep ? SAMPLE_SOURCES : undefined);
  const judgePrompt = buildJudgePrompt(session);

  const sections = [
    { id: "offer", label: d.report.nav.offer },
    { id: "control", label: d.report.nav.control },
    { id: "providers", label: d.report.nav.providers },
    { id: "roster", label: d.report.nav.roster },
    { id: "prompts", label: d.report.nav.prompts },
    { id: "pipeline", label: d.report.nav.pipeline },
    { id: "turn-demo", label: d.report.nav.turnDemo },
    { id: "cost", label: d.report.nav.cost },
    { id: "stack", label: d.report.nav.stack },
  ];

  const providerRows = [
    {
      brand: "OpenAI",
      used: d.report.providers.openaiUsed,
      envKey: "OPENAI_API_KEY",
      notes: d.report.providers.openaiNotes,
    },
    {
      brand: "DeepSeek",
      used: d.report.providers.deepseekUsed,
      envKey: "DEEPSEEK_API_KEY",
      notes: d.report.providers.deepseekNotes,
    },
    {
      brand: "OpenRouter",
      used: d.report.providers.openrouterUsed,
      envKey: "OPENROUTER_API_KEY",
      notes: d.report.providers.openrouterNotes,
    },
    {
      brand: "Brave Search",
      used: d.report.providers.braveUsed,
      envKey: "BRAVE_SEARCH_API_KEY",
      notes: d.report.providers.braveNotes,
    },
  ];

  const configEntries = [
    {
      name: "OPENAI_API_KEY / DEEPSEEK_API_KEY / OPENROUTER_API_KEY",
      desc: d.report.stack.configBackends,
      core: true,
    },
    { name: "BRAVE_SEARCH_API_KEY", desc: d.report.stack.configBraveSearch, core: false },
    { name: "SEARCH_PROVIDER", desc: d.report.stack.configSearchProvider, core: false },
    { name: "SEARCH_COST_USD", desc: d.report.stack.configSearchCost, core: false },
    { name: "DEEP_SEARCH_MODE", desc: d.report.stack.configDeepMode, core: false },
    {
      name: "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
      desc: d.report.stack.configSupabase,
      core: false,
    },
    { name: "RL_* / SPEND_*", desc: d.report.stack.configLimits, core: false },
  ];

  return (
    <GameShell wide>
      <div className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{d.report.title}</h1>
          {/* Standalone-report actions (hidden when printing). */}
          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <Link
              href="/"
              className="rounded-btn border-3 border-ink bg-surface px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition hover:bg-arcade-yellow hover:text-night focus-visible:outline-3 focus-visible:outline-offset-2"
            >
              {d.report.toolbar.home}
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-btn border-3 border-ink bg-arcade-yellow px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-night transition hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2"
            >
              {d.report.toolbar.print}
            </button>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-ink/70">
          {d.report.intro.lead}
          <em>{d.report.intro.actual1}</em>
          {d.report.intro.mid1}
          <em>{d.report.intro.actual2}</em>
          {d.report.intro.mid2}
          <em>{d.report.intro.actual3}</em>
          {d.report.intro.tail}
        </p>
      </div>

      <SectionNav sections={sections} ariaLabel={d.report.nav.aria} />

      <div className="space-y-6">
        {/* 1 · What is Debator */}
        <div id="offer" className="scroll-mt-28">
          <GamePanel title={<AnchorTitle id="offer" title={d.report.offer.title} />}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-card border-3 border-ink bg-surface p-3">
                <p className="font-heading text-sm font-extrabold">{d.report.offer.debate.heading}</p>
                <p className="mt-1 text-sm text-ink/70">{d.report.offer.debate.body}</p>
              </div>
              <div className="rounded-card border-3 border-ink bg-surface p-3">
                <p className="font-heading text-sm font-extrabold">{d.report.offer.judge.heading}</p>
                <p className="mt-1 text-sm text-ink/70">{d.report.offer.judge.body}</p>
              </div>
              <div className="rounded-card border-3 border-ink bg-arcade-purple/15 p-3">
                <p className="font-heading text-sm font-extrabold">{d.report.offer.deep.heading}</p>
                <p className="mt-1 text-sm text-ink/70">{d.report.offer.deep.body}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink/70">{d.report.offer.footer}</p>
          </GamePanel>
        </div>

        {/* 2 · Who controls the match — interactive turn lifecycle */}
        <div id="control" className="scroll-mt-28">
          <GamePanel title={<AnchorTitle id="control" title={d.report.control.title} />}>
            <FlowDiagram
              hint={d.report.control.hint}
              steps={[
                {
                  key: "validate",
                  icon: "✅",
                  node: d.report.control.step1.node,
                  title: d.report.control.step1.title,
                  body: d.report.control.step1.body,
                },
                {
                  key: "limits",
                  icon: "🚦",
                  node: d.report.control.gate.node,
                  title: d.report.control.gate.title,
                  body: d.report.control.gate.body,
                },
                {
                  key: "plan",
                  icon: "📋",
                  node: d.report.control.step2.node,
                  title: d.report.control.step2.title,
                  body: d.report.control.step2.body(
                    effectiveRounds,
                    effectiveRounds * 2,
                    session.judge.enabled,
                  ),
                },
                {
                  key: "turn",
                  icon: "🎯",
                  node: d.report.control.step3.node,
                  title: d.report.control.step3.title,
                  body: (
                    <>
                      {d.report.control.step3.bodyPre}
                      <code className="font-mono text-xs">/api/debate/turn</code>
                      {d.report.control.step3.bodyPost}
                    </>
                  ),
                },
                {
                  key: "ground",
                  icon: "🌐",
                  node: d.report.control.step4.node,
                  title: d.report.control.step4.title,
                  body: d.report.control.step4.body,
                },
                {
                  key: "judge",
                  icon: "⚖️",
                  node: d.report.control.step5.node,
                  title: d.report.control.step5.title,
                  body: (
                    <>
                      {d.report.control.step5.bodyPre}
                      <code className="font-mono text-xs">/api/debate/verdict</code>
                      {d.report.control.step5.bodyPost}
                    </>
                  ),
                },
              ]}
            />
          </GamePanel>
        </div>

        {/* 3 · Providers */}
        <div id="providers" className="scroll-mt-28">
          <GamePanel title={<AnchorTitle id="providers" title={d.report.providers.title} />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-3 border-ink text-left font-heading text-xs uppercase tracking-wide text-ink/60">
                    <th className="py-2 pr-3">{d.report.providers.colBackend}</th>
                    <th className="py-2 pr-3">{d.report.providers.colUsedFor}</th>
                    <th className="py-2 pr-3">{d.report.providers.colKey}</th>
                    <th className="py-2">{d.report.providers.colNotes}</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {providerRows.map((row, i) => (
                    <tr key={row.brand} className={cn(i < providerRows.length - 1 && "border-b border-ink/15")}>
                      <td className="py-2 pr-3 font-bold">
                        <span className="flex items-center gap-2">
                          <BrandLogo brand={row.brand} size={14} />
                          {row.brand}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{row.used}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.envKey}</td>
                      <td className="py-2 text-ink/70">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 rounded-card border-3 border-dashed border-ink/40 bg-paper p-2.5 text-xs text-ink/65">
              {d.report.providers.securityNote}
            </p>
          </GamePanel>
        </div>

        {/* 4 · Model roster — interactive fighter cards */}
        <div id="roster" className="scroll-mt-28">
          <GamePanel title={<AnchorTitle id="roster" title={d.report.roster.title} />}>
            <FighterRoster />
            <p className="mt-3 text-xs text-ink/55">
              {d.report.roster.footerPre}
              <span className="font-mono">/v1/models</span>
              {d.report.roster.footerPost}
            </p>
          </GamePanel>
        </div>

        {/* 5 · Prompt playground */}
        <div id="prompts" className="scroll-mt-28">
          <GamePanel
            title={<AnchorTitle id="prompts" title={d.report.playground.title} />}
            sticker={d.report.playground.sticker}
          >
            <p className="mb-4 text-sm text-ink/70">
              {d.report.playground.intro1}
              <em>{d.report.playground.introEm}</em>
              {d.report.playground.intro2}
            </p>

            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              <div className="space-y-3">
                <Knob label={d.report.playground.knobTopic}>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    maxLength={280}
                    className="w-full rounded-btn border-3 border-ink bg-surface px-3 py-1.5 text-sm outline-none focus-visible:outline-3 focus-visible:outline-offset-2"
                  />
                </Knob>
                <Knob
                  label={
                    deep
                      ? d.report.playground.knobToneLocked
                      : d.report.playground.knobTone
                  }
                >
                  {TONE_OPTIONS.map((t) => (
                    <Chip
                      key={t.id}
                      active={effectiveTone === t.id}
                      disabled={deep}
                      onClick={() => setTone(t.id)}
                    >
                      {t.emoji} {t.label}
                    </Chip>
                  ))}
                </Knob>
                {tone === "custom" && !deep ? (
                  <Knob label={d.report.playground.knobCustomTone}>
                    <input
                      type="text"
                      value={customTone}
                      onChange={(e) => setCustomTone(e.target.value)}
                      maxLength={90}
                      className="w-full rounded-btn border-3 border-ink bg-surface px-3 py-1.5 text-sm outline-none focus-visible:outline-3 focus-visible:outline-offset-2"
                    />
                  </Knob>
                ) : null}
              </div>

              <div className="space-y-3">
                {/* Rounds + length knobs removed — matches are strictly 3 rounds
                    and short length (July 2026); this page mirrors the REAL setup
                    rules, so only the still-configurable knobs are shown. */}
                <Knob label={d.report.playground.knobDeep}>
                  <Chip active={!deep} onClick={() => setDeep(false)}>{d.report.playground.deepOff}</Chip>
                  <Chip active={deep} onClick={() => { setDeep(true); setTurnIdx(0); }}>
                    {d.report.playground.deepOn}
                  </Chip>
                </Knob>
              </div>
            </div>

            {/* The deterministic match timeline doubles as the turn picker. */}
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">
                {d.report.playground.timelineLabel}
              </p>
              <RoundTimeline
                turns={fighterTurns}
                selectedIdx={Math.min(turnIdx, fighterTurns.length - 1)}
                onSelect={setTurnIdx}
                judgeEnabled={session.judge.enabled}
              />
            </div>

            <div className="space-y-4">
              <PromptBlock
                label={d.report.playground.systemLabel(deep)}
                text={systemPrompt}
              />
              <PromptBlock
                label={d.report.playground.turnLabel(
                  turn.roundNumber,
                  turn.roundLabel,
                  turn.speaker === "modelA" ? session.modelA.displayName : session.modelB.displayName,
                  deep,
                )}
                text={turnPrompt}
              />
              <p className="text-xs text-ink/55">{d.report.playground.note}</p>
              <div>
                <button
                  type="button"
                  onClick={() => setShowJudge((v) => !v)}
                  className="rounded-btn border-3 border-ink bg-surface px-3 py-1.5 text-xs font-extrabold transition hover:bg-arcade-yellow hover:text-night"
                >
                  {showJudge ? d.report.playground.hideJudge : d.report.playground.showJudge}
                  {d.report.playground.judgeToggleTail}
                </button>
                {showJudge ? (
                  <div className="mt-3">
                    <PromptBlock
                      label={d.report.playground.judgeLabel}
                      text={judgePrompt}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </GamePanel>
        </div>

        {/* 6 · Deep Debate pipeline — interactive flow */}
        <div id="pipeline" className="scroll-mt-28">
          <GamePanel title={<AnchorTitle id="pipeline" title={d.report.pipeline.title} />}>
            <FlowDiagram
              hint={d.report.pipeline.hint}
              steps={[
                {
                  key: "search",
                  icon: "🔎",
                  node: d.report.pipeline.step1.title,
                  title: d.report.pipeline.step1.title,
                  body: d.report.pipeline.step1.body,
                },
                {
                  key: "rank",
                  icon: "🏅",
                  node: d.report.pipeline.step2.title,
                  title: d.report.pipeline.step2.title,
                  body: d.report.pipeline.step2.body,
                },
                {
                  key: "ground",
                  icon: "📌",
                  node: d.report.pipeline.step3.title,
                  title: d.report.pipeline.step3.title,
                  body: (
                    <>
                      {d.report.pipeline.step3.bodyPre}
                      <em>{d.report.pipeline.step3.bodyEm}</em>
                      {d.report.pipeline.step3.bodyPost}
                    </>
                  ),
                },
                {
                  key: "verify",
                  icon: "✅",
                  node: d.report.pipeline.step4.title,
                  title: d.report.pipeline.step4.title,
                  body: d.report.pipeline.step4.body,
                },
                {
                  key: "disclose",
                  icon: "📖",
                  node: d.report.pipeline.step5.title,
                  title: d.report.pipeline.step5.title,
                  body: d.report.pipeline.step5.body,
                },
              ]}
            />
          </GamePanel>
        </div>

        {/* 7 · What a turn looks like */}
        <div id="turn-demo" className="scroll-mt-28">
          <GamePanel title={<AnchorTitle id="turn-demo" title={d.report.turnDemo.title} />}>
            <p className="mb-3 text-sm text-ink/70">{d.report.turnDemo.intro}</p>
            <DebateMessageCard
              speaker="modelA"
              title="GPT-4o Mini"
              subtitle={d.report.turnDemo.cardSubtitle}
              avatar="💨"
              color="blue"
              roundLabel={d.report.turnDemo.cardRoundLabel}
              stance="pro"
              content={d.report.turnDemo.cardContent}
              citations={SAMPLE_SOURCES.concat([
                {
                  index: 3,
                  title: "ICO — Age assurance and the Children's Code",
                  url: "https://ico.org.uk/",
                  quote: "A token confirming someone's age can be supplied when requesting access.",
                },
                {
                  index: 4,
                  title: "EFF — The dangers of mandatory age verification",
                  url: "https://www.eff.org/",
                  quote: "Age-verification systems inevitably block some adults from lawful speech.",
                },
              ])}
              usage={{ inputTokens: 1214, outputTokens: 449, totalTokens: 1663 }}
              cost={{ inputCost: 0.00018, outputCost: 0.00027, totalCost: 0.00045, currency: "USD" }}
              latencyMs={4760}
            />
          </GamePanel>
        </div>

        {/* 8 · Cost model */}
        <div id="cost" className="scroll-mt-28">
          <GamePanel title={<AnchorTitle id="cost" title={d.report.cost.title} />}>
            <p className="mb-3 text-sm text-ink/70">
              {d.report.cost.intro}
              <span className="font-semibold">{d.report.cost.introCached}</span>
              {d.report.cost.introTail}
            </p>
            <PricingExplorer />
            <ul className="mt-3 space-y-1 text-xs text-ink/65">
              <li>
                {d.report.cost.note1(
                  FALLBACK_PRICE.inputCostPer1M.toFixed(2),
                  FALLBACK_PRICE.outputCostPer1M.toFixed(2),
                )}
              </li>
              <li>{d.report.cost.note2(DEEP_SEARCH_COST_USD.toFixed(3))}</li>
              <li>{d.report.cost.note3}</li>
              <li>{d.report.cost.note4}</li>
              {VOICE_ENABLED ? (
                <li>{d.report.cost.note5(TTS_COST_USD_PER_1M_CHARS.toFixed(0))}</li>
              ) : null}
            </ul>
            <div className="mt-4">
              <CostEstimator />
            </div>
          </GamePanel>
        </div>

        {/* 9 · Stack & configuration */}
        <div id="stack" className="scroll-mt-28">
          <GamePanel title={<AnchorTitle id="stack" title={d.report.stack.title} />}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  {d.report.stack.stackHeading}
                </p>
                <ul className="space-y-1 text-sm text-ink/75">
                  {d.report.stack.stackItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                  {d.report.stack.configHeading}
                </p>
                <div className="space-y-2">
                  {configEntries.map((entry) => (
                    <div key={entry.name} className="rounded-card border-3 border-ink bg-surface p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="break-all font-mono text-xs font-bold">{entry.name}</p>
                        <Badge color={entry.core ? "yellow" : "white"} size="sm">
                          {entry.core ? d.report.stack.badgeCore : d.report.stack.badgeOptional}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink/65">{entry.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink/55">{d.report.stack.configFooter}</p>
              </div>
            </div>
          </GamePanel>
        </div>

        <p className="pb-2 text-center text-xs text-ink/45">
          {d.report.footer}
          <Badge color="yellow" size="sm">{d.report.footerBadge}</Badge>
        </p>
      </div>
    </GameShell>
  );
}
