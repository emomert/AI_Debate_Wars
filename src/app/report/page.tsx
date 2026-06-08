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

import { useT } from "@/lib/i18n/LocaleProvider";
import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { Badge } from "@/components/game/Badge";
import { DebateMessageCard } from "@/components/debate/DebateMessageCard";

import {
  buildJudgePrompt,
  buildSystemPrompt,
  buildTurnPrompt,
  lengthPreset,
} from "@/lib/debate/promptBuilder";
import { createDebateSession } from "@/lib/debate/orchestrator";
import {
  BRANDS,
  COST_TIER_LABEL,
  familiesForBrand,
} from "@/lib/models/modelRegistry";
import { modelPricing, FALLBACK_PRICE } from "@/lib/cost/pricing";
import { DEEP_SEARCH_COST_USD } from "@/lib/debate/citations";
import { TONE_OPTIONS } from "@/lib/constants";
import { defaultFighters, toSelectedModel } from "@/lib/state/ArenaContext";
import type {
  Citation,
  DebateConfig,
  DebateMode,
  DebateTone,
  ResponseLength,
  RoundCount,
} from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------- bits ---------------------------------- */

function PromptBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
        {label}
      </p>
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-btn border-3 border-ink bg-arcade-yellow font-display text-base text-night shadow-hard-sm">
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-heading text-sm font-extrabold">{title}</p>
        <p className="text-sm text-ink/70">{children}</p>
      </div>
    </li>
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

/** Show 2 decimals, but up to 3 so sub-cent rates (e.g. $0.435) aren't rounded. */
function priceText(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

/* ---------------------------------- page ---------------------------------- */

export default function ReportPage() {
  const d = useT();
  // Prompt playground state — mirrors the real Setup rules (deep locks
  // rounds to 3, tone to serious, length to the fixed template).
  const [topic, setTopic] = useState("Should social media platforms verify user age?");
  const [mode, setMode] = useState<DebateMode>("debate");
  const [tone, setTone] = useState<DebateTone>("serious");
  const [customTone, setCustomTone] = useState("like an excited sports commentator");
  const [length, setLength] = useState<ResponseLength>("medium");
  const [rounds, setRounds] = useState<RoundCount>(3);
  const [deep, setDeep] = useState(false);
  const [turnIdx, setTurnIdx] = useState(0);
  const [showJudge, setShowJudge] = useState(false);

  const effectiveTone = deep ? "serious" : tone;
  const effectiveRounds = deep ? 3 : rounds;

  const session = useMemo(() => {
    const { a, b } = defaultFighters();
    const config: DebateConfig = {
      topic: topic.trim() || "Should social media platforms verify user age?",
      mode,
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
  }, [topic, mode, effectiveTone, customTone, length, effectiveRounds, deep]);

  const fighterTurns = session.turns.filter((t) => t.speaker !== "judge");
  const turn = fighterTurns[Math.min(turnIdx, fighterTurns.length - 1)];
  const systemPrompt = buildSystemPrompt(mode, deep);
  const turnPrompt = buildTurnPrompt(session, turn, deep ? SAMPLE_SOURCES : undefined);
  const judgePrompt = buildJudgePrompt(session);

  const presets = (["short", "medium", "long"] as const).map((l) => ({
    id: l,
    ...lengthPreset(l),
  }));

  // Localized mode word for the prompt-block labels (debate/discussion).
  const modeWord =
    mode === "debate" ? d.report.playground.modeWordDebate : d.report.playground.modeWordDiscussion;

  return (
    <GameShell wide>
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{d.report.title}</h1>
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

      <div className="space-y-6">
        {/* 1 · What is Debator */}
        <GamePanel title={d.report.offer.title}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border-3 border-ink bg-surface p-3">
              <p className="font-heading text-sm font-extrabold">{d.report.offer.debate.heading}</p>
              <p className="mt-1 text-sm text-ink/70">{d.report.offer.debate.body}</p>
            </div>
            <div className="rounded-card border-3 border-ink bg-surface p-3">
              <p className="font-heading text-sm font-extrabold">{d.report.offer.discussion.heading}</p>
              <p className="mt-1 text-sm text-ink/70">{d.report.offer.discussion.body}</p>
            </div>
            <div className="rounded-card border-3 border-ink bg-arcade-purple/15 p-3">
              <p className="font-heading text-sm font-extrabold">{d.report.offer.deep.heading}</p>
              <p className="mt-1 text-sm text-ink/70">{d.report.offer.deep.body}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/70">{d.report.offer.footer}</p>
        </GamePanel>

        {/* 2 · Who controls the match */}
        <GamePanel title={d.report.control.title}>
          <ol className="space-y-3">
            <Step n={1} title={d.report.control.step1.title}>
              {d.report.control.step1.body}
            </Step>
            <Step n={2} title={d.report.control.step2.title}>
              {d.report.control.step2.body(
                effectiveRounds,
                effectiveRounds * 2,
                session.judge.enabled,
              )}
            </Step>
            <Step n={3} title={d.report.control.step3.title}>
              {d.report.control.step3.bodyPre}
              <code className="font-mono text-xs">/api/debate/turn</code>
              {d.report.control.step3.bodyPost}
            </Step>
            <Step n={4} title={d.report.control.step4.title}>
              {d.report.control.step4.body}
            </Step>
            <Step n={5} title={d.report.control.step5.title}>
              {d.report.control.step5.bodyPre}
              <code className="font-mono text-xs">/api/debate/verdict</code>
              {d.report.control.step5.bodyPost}
            </Step>
          </ol>
        </GamePanel>

        {/* 3 · Providers */}
        <GamePanel title={d.report.providers.title}>
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
                <tr className="border-b border-ink/15">
                  <td className="py-2 pr-3 font-bold">OpenAI</td>
                  <td className="py-2 pr-3">{d.report.providers.openaiUsed}</td>
                  <td className="py-2 pr-3 font-mono text-xs">OPENAI_API_KEY</td>
                  <td className="py-2 text-ink/70">{d.report.providers.openaiNotes}</td>
                </tr>
                <tr className="border-b border-ink/15">
                  <td className="py-2 pr-3 font-bold">DeepSeek</td>
                  <td className="py-2 pr-3">{d.report.providers.deepseekUsed}</td>
                  <td className="py-2 pr-3 font-mono text-xs">DEEPSEEK_API_KEY</td>
                  <td className="py-2 text-ink/70">{d.report.providers.deepseekNotes}</td>
                </tr>
                <tr className="border-b border-ink/15">
                  <td className="py-2 pr-3 font-bold">OpenRouter</td>
                  <td className="py-2 pr-3">{d.report.providers.openrouterUsed}</td>
                  <td className="py-2 pr-3 font-mono text-xs">OPENROUTER_API_KEY</td>
                  <td className="py-2 text-ink/70">{d.report.providers.openrouterNotes}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-bold">Brave Search</td>
                  <td className="py-2 pr-3">{d.report.providers.braveUsed}</td>
                  <td className="py-2 pr-3 font-mono text-xs">BRAVE_SEARCH_API_KEY</td>
                  <td className="py-2 text-ink/70">{d.report.providers.braveNotes}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-card border-3 border-dashed border-ink/40 bg-paper p-2.5 text-xs text-ink/65">
            {d.report.providers.securityNote}
          </p>
        </GamePanel>

        {/* 4 · Model roster */}
        <GamePanel title={d.report.roster.title}>
          <div className="space-y-4">
            {BRANDS.map((b) => (
              <div key={b.brand}>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide">
                  {b.brand}{" "}
                  <span className="text-ink/45">
                    · {b.backend === "openrouter" ? d.report.roster.freeVia : b.backend}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {familiesForBrand(b.brand).map((f) => (
                    <div
                      key={f.family}
                      className="rounded-card border-3 border-ink bg-surface px-2.5 py-1.5"
                    >
                      <p className="text-xs font-extrabold">{f.family}</p>
                      <p className="text-[11px] text-ink/60">
                        {f.models
                          .map((m) => `${m.displayName} (${m.debateRating} · ${COST_TIER_LABEL[m.costTier]})`)
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink/55">
            {d.report.roster.footerPre}
            <span className="font-mono">/v1/models</span>
            {d.report.roster.footerPost}
          </p>
        </GamePanel>

        {/* 5 · Prompt playground */}
        <GamePanel title={d.report.playground.title} sticker={d.report.playground.sticker}>
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
              <Knob label={d.report.playground.knobMode}>
                <Chip active={mode === "debate"} onClick={() => setMode("debate")}>{d.report.playground.modeDebate}</Chip>
                <Chip active={mode === "discussion"} onClick={() => setMode("discussion")}>{d.report.playground.modeDiscussion}</Chip>
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
              <Knob
                label={
                  deep
                    ? d.report.playground.knobRoundsLocked
                    : d.report.playground.knobRounds
                }
              >
                {([3, 5, 7] as const).map((r) => (
                  <Chip
                    key={r}
                    active={effectiveRounds === r}
                    disabled={deep}
                    onClick={() => {
                      setRounds(r);
                      setTurnIdx(0);
                    }}
                  >
                    {d.report.playground.roundsLabel(r)}
                  </Chip>
                ))}
              </Knob>
              <Knob
                label={
                  deep
                    ? d.report.playground.knobLengthLocked
                    : d.report.playground.knobLength
                }
              >
                {presets.map((p) => (
                  <Chip
                    key={p.id}
                    active={!deep && length === p.id}
                    disabled={deep}
                    onClick={() => setLength(p.id)}
                  >
                    {d.report.playground.lengthLabel(p.id, p.maxTokens)}
                  </Chip>
                ))}
              </Knob>
              <Knob label={d.report.playground.knobDeep}>
                <Chip active={!deep} onClick={() => setDeep(false)}>{d.report.playground.deepOff}</Chip>
                <Chip active={deep} onClick={() => { setDeep(true); setTurnIdx(0); }}>
                  {d.report.playground.deepOn}
                </Chip>
              </Knob>
              <Knob label={d.report.playground.knobPreview}>
                {fighterTurns.map((t, i) => (
                  <Chip key={t.id} active={i === Math.min(turnIdx, fighterTurns.length - 1)} onClick={() => setTurnIdx(i)}>
                    R{t.roundNumber}·{t.speaker === "modelA" ? "A" : "B"}
                  </Chip>
                ))}
              </Knob>
            </div>
          </div>

          <div className="space-y-4">
            <PromptBlock
              label={d.report.playground.systemLabel(modeWord, deep)}
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

        {/* 6 · Deep Debate pipeline */}
        <GamePanel title={d.report.pipeline.title}>
          <ol className="space-y-3">
            <Step n={1} title={d.report.pipeline.step1.title}>
              {d.report.pipeline.step1.body}
            </Step>
            <Step n={2} title={d.report.pipeline.step2.title}>
              {d.report.pipeline.step2.body}
            </Step>
            <Step n={3} title={d.report.pipeline.step3.title}>
              {d.report.pipeline.step3.bodyPre}
              <em>{d.report.pipeline.step3.bodyEm}</em>
              {d.report.pipeline.step3.bodyPost}
            </Step>
            <Step n={4} title={d.report.pipeline.step4.title}>
              {d.report.pipeline.step4.body}
            </Step>
            <Step n={5} title={d.report.pipeline.step5.title}>
              {d.report.pipeline.step5.body}
            </Step>
          </ol>
        </GamePanel>

        {/* 7 · What a turn looks like */}
        <GamePanel title={d.report.turnDemo.title}>
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

        {/* 8 · Cost model */}
        <GamePanel title={d.report.cost.title}>
          <p className="mb-3 text-sm text-ink/70">
            {d.report.cost.intro}
            <span className="font-semibold">{d.report.cost.introCached}</span>
            {d.report.cost.introTail}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b-3 border-ink text-left font-heading text-xs uppercase tracking-wide text-ink/60">
                  <th className="py-2 pr-3">{d.report.cost.colModel}</th>
                  <th className="py-2 pr-3">{d.report.cost.colInput}</th>
                  <th className="py-2 pr-3">{d.report.cost.colCached}</th>
                  <th className="py-2">{d.report.cost.colOutput}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(modelPricing).map(([key, p]) => (
                  <tr key={key} className="border-b border-ink/10">
                    <td className="py-1.5 pr-3 font-mono text-xs">{key}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">${priceText(p.inputCostPer1M)}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-arcade-green">
                      ${priceText(p.cachedInputCostPer1M ?? p.inputCostPer1M)}
                    </td>
                    <td className="py-1.5 font-mono text-xs">${priceText(p.outputCostPer1M)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          </ul>
        </GamePanel>

        {/* 9 · Stack & configuration */}
        <GamePanel title={d.report.stack.title}>
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
              <ul className="space-y-1 text-xs text-ink/75">
                <li><span className="font-mono font-bold">OPENAI_API_KEY / DEEPSEEK_API_KEY / OPENROUTER_API_KEY</span> — {d.report.stack.configBackends}</li>
                <li><span className="font-mono font-bold">BRAVE_SEARCH_API_KEY</span> — {d.report.stack.configBraveSearch}</li>
                <li><span className="font-mono font-bold">SEARCH_PROVIDER</span> — {d.report.stack.configSearchProvider}</li>
                <li><span className="font-mono font-bold">SEARCH_COST_USD</span> — {d.report.stack.configSearchCost}</li>
                <li><span className="font-mono font-bold">DEEP_SEARCH_MODE</span> — {d.report.stack.configDeepMode}</li>
              </ul>
              <p className="mt-2 text-xs text-ink/55">{d.report.stack.configFooter}</p>
            </div>
          </div>
        </GamePanel>

        <p className="pb-2 text-center text-xs text-ink/45">
          {d.report.footer}
          <Badge color="yellow" size="sm">{d.report.footerBadge}</Badge>
        </p>
      </div>
    </GameShell>
  );
}
