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

  return (
    <GameShell wide>
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Technical Report</h1>
        <p className="mt-2 max-w-3xl text-ink/70">
          How Debator works under the hood — live from the same code that runs your matches.
          The prompts below are generated by the <em>actual</em> prompt builder, the model
          roster is the <em>actual</em> catalogue, and the prices are the <em>actual</em>{" "}
          pricing table. Nothing on this page is a screenshot that can go stale.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1 · What is Debator */}
        <GamePanel title="1 · What we offer">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border-3 border-ink bg-surface p-3">
              <p className="font-heading text-sm font-extrabold">🥊 Debate Mode</p>
              <p className="mt-1 text-sm text-ink/70">
                Two AI models argue opposite sides of your topic across 3–7 fixed rounds —
                openings, rebuttals, closings. An optional third model judges the match and
                declares a winner with scores.
              </p>
            </div>
            <div className="rounded-card border-3 border-ink bg-surface p-3">
              <p className="font-heading text-sm font-extrabold">💬 Discussion Mode</p>
              <p className="mt-1 text-sm text-ink/70">
                The same engine, cooperative: one model builds on your idea, the other
                stress-tests it. The judge (optional) extracts insights and next steps instead
                of picking a winner.
              </p>
            </div>
            <div className="rounded-card border-3 border-ink bg-arcade-purple/15 p-3">
              <p className="font-heading text-sm font-extrabold">🌐 Deep Debate</p>
              <p className="mt-1 text-sm text-ink/70">
                Every turn is grounded in a live web search. Fighters quote and cite real
                sources with [n] markers, shown in a collapsible source list. Fixed format: 3
                rounds, standard tone, auto length.
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/70">
            Per-turn token usage, latency and an honest running cost are always on screen — the
            arcade look is the interface, cost transparency is the contract.
          </p>
        </GamePanel>

        {/* 2 · Who controls the match */}
        <GamePanel title="2 · The app controls the match — never the models">
          <ol className="space-y-3">
            <Step n={1} title="Setup is validated twice">
              The Start button gates on client-side validation; the server re-validates every
              request independently (topic length, enums, fighter ids, round caps, Deep Debate
              limits) — a forged request can&apos;t buy more than the UI allows.
            </Step>
            <Step n={2} title="A fixed turn plan is built before anyone speaks">
              The orchestrator expands your config into the complete list of turns up front —
              who speaks, in which round, with what task. With {effectiveRounds} rounds that is{" "}
              {effectiveRounds * 2} fighter turns{session.judge.enabled ? " plus one judge turn" : ""}.
              Models cannot add, skip or reorder turns.
            </Step>
            <Step n={3} title="One API call generates exactly one turn">
              The browser calls <code className="font-mono text-xs">/api/debate/turn</code> with
              the session and the next turn id. The server checks it really is the next pending
              turn, builds the prompts, calls the provider once, computes the cost, and returns
              a single message. No loops, no agent autonomy.
            </Step>
            <Step n={4} title="Deep Debate searches before prompting">
              On deep turns the server first runs a web search (Brave) on your topic and injects
              the numbered results into the prompt as the model&apos;s only allowed evidence.
              Citation markers that don&apos;t match a real source are stripped; sources the
              model never cited aren&apos;t claimed.
            </Step>
            <Step n={5} title="The judge runs once, at the end">
              When every round is complete,{" "}
              <code className="font-mono text-xs">/api/debate/verdict</code> asks the judge model
              for strict JSON — summary, strongest/weakest arguments, scores, winner. The app
              picks the judge (never one of the fighters when on auto).
            </Step>
          </ol>
        </GamePanel>

        {/* 3 · Providers */}
        <GamePanel title="3 · Providers & where your data goes">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b-3 border-ink text-left font-heading text-xs uppercase tracking-wide text-ink/60">
                  <th className="py-2 pr-3">Backend</th>
                  <th className="py-2 pr-3">Used for</th>
                  <th className="py-2 pr-3">Server-side key</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-ink/15">
                  <td className="py-2 pr-3 font-bold">OpenAI</td>
                  <td className="py-2 pr-3">GPT-4o → GPT-5.5 fighters &amp; judges</td>
                  <td className="py-2 pr-3 font-mono text-xs">OPENAI_API_KEY</td>
                  <td className="py-2 text-ink/70">Chat Completions API, streaming-capable</td>
                </tr>
                <tr className="border-b border-ink/15">
                  <td className="py-2 pr-3 font-bold">DeepSeek</td>
                  <td className="py-2 pr-3">DeepSeek V4 fighters &amp; judges</td>
                  <td className="py-2 pr-3 font-mono text-xs">DEEPSEEK_API_KEY</td>
                  <td className="py-2 text-ink/70">OpenAI-compatible endpoint</td>
                </tr>
                <tr className="border-b border-ink/15">
                  <td className="py-2 pr-3 font-bold">OpenRouter</td>
                  <td className="py-2 pr-3">22 free open-weight fighters (Qwen, Llama, …)</td>
                  <td className="py-2 pr-3 font-mono text-xs">OPENROUTER_API_KEY</td>
                  <td className="py-2 text-ink/70">
                    $0 token cost; hidden reasoning capped for fast turns
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-bold">Brave Search</td>
                  <td className="py-2 pr-3">Deep Debate web research (all fighters)</td>
                  <td className="py-2 pr-3 font-mono text-xs">BRAVE_SEARCH_API_KEY</td>
                  <td className="py-2 text-ink/70">
                    Only the debate topic is sent as the query — never the transcript
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-card border-3 border-dashed border-ink/40 bg-paper p-2.5 text-xs text-ink/65">
            🔒 All keys live only on the server (Vercel env vars). The browser talks exclusively
            to our own API routes; no key or provider call ever runs client-side. (The prompt
            templates are deliberately public — you&apos;re reading them live in section 5.) A
            pluggable search registry means the search engine (and its per-query fee) is
            swappable by configuration, not code.
          </p>
        </GamePanel>

        {/* 4 · Model roster */}
        <GamePanel title="4 · The fighter roster (live catalogue)">
          <div className="space-y-4">
            {BRANDS.map((b) => (
              <div key={b.brand}>
                <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide">
                  {b.brand}{" "}
                  <span className="text-ink/45">
                    · {b.backend === "openrouter" ? "free via OpenRouter" : b.backend}
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
            Ratings are our debate-fit score (0–100). The OpenAI list is verified against the
            live <span className="font-mono">/v1/models</span> endpoint; the free roster is a
            snapshot of OpenRouter&apos;s catalogue.
          </p>
        </GamePanel>

        {/* 5 · Prompt playground */}
        <GamePanel title="5 · The prompts — exactly what we send" sticker="LIVE">
          <p className="mb-4 text-sm text-ink/70">
            This playground calls the same prompt builder the server uses. Change a knob and
            watch the prompt change — that diff is <em>precisely</em> what your setting does to
            the model&apos;s instructions.
          </p>

          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <Knob label="Topic — becomes the “Topic or idea:” line (and the Deep Debate search query)">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={280}
                  className="w-full rounded-btn border-3 border-ink bg-surface px-3 py-1.5 text-sm outline-none focus-visible:outline-3 focus-visible:outline-offset-2"
                />
              </Knob>
              <Knob label="Mode — swaps the entire base system prompt + roles & stances">
                <Chip active={mode === "debate"} onClick={() => setMode("debate")}>🥊 Debate</Chip>
                <Chip active={mode === "discussion"} onClick={() => setMode("discussion")}>💬 Discussion</Chip>
              </Knob>
              <Knob
                label={
                  deep
                    ? "Tone — locked to Serious in Deep Debate"
                    : "Tone — rewrites the “Tone:” instruction line"
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
                <Knob label="Custom tone (sanitized + capped at 80 chars, wrapped in a guard sentence)">
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
                    ? "Rounds — locked to 3 in Deep Debate"
                    : "Rounds — sets the turn plan length & each round's task"
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
                    {r} rounds
                  </Chip>
                ))}
              </Knob>
              <Knob
                label={
                  deep
                    ? "Length — replaced by the fixed Deep template (≈350–600 words, 1500 tokens)"
                    : "Length — sets the “Maximum length:” line + the provider's token cap"
                }
              >
                {presets.map((p) => (
                  <Chip
                    key={p.id}
                    active={!deep && length === p.id}
                    disabled={deep}
                    onClick={() => setLength(p.id)}
                  >
                    {p.id} · {p.maxTokens} tok
                  </Chip>
                ))}
              </Knob>
              <Knob label="Deep Debate — appends the research addendum + injects numbered web sources">
                <Chip active={!deep} onClick={() => setDeep(false)}>Off</Chip>
                <Chip active={deep} onClick={() => { setDeep(true); setTurnIdx(0); }}>
                  🌐 On
                </Chip>
              </Knob>
              <Knob label="Preview turn — same template, different round task & speaker">
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
              label={`System prompt — ${mode} mode${deep ? " + Deep Debate addendum" : ""}`}
              text={systemPrompt}
            />
            <PromptBlock
              label={`Turn prompt — round ${turn.roundNumber} (“${turn.roundLabel}”), ${
                turn.speaker === "modelA" ? session.modelA.displayName : session.modelB.displayName
              }${deep ? " — with injected web sources" : ""}`}
              text={turnPrompt}
            />
            <p className="text-xs text-ink/55">
              In a real match the “Previous messages” section fills with the actual transcript,
              and on Deep turns the sample sources above are replaced by live Brave results at
              request time. Fighters request temperature 0.8 where the model accepts a custom
              temperature; reasoning-style models (GPT-5.x without “-chat”, o-series) ignore it
              and run at the provider default.
            </p>
            <div>
              <button
                type="button"
                onClick={() => setShowJudge((v) => !v)}
                className="rounded-btn border-3 border-ink bg-surface px-3 py-1.5 text-xs font-extrabold transition hover:bg-arcade-yellow hover:text-night"
              >
                {showJudge ? "▴ Hide" : "▾ Show"} the judge prompt
              </button>
              {showJudge ? (
                <div className="mt-3">
                  <PromptBlock
                    label="Judge prompt — strict JSON contract so every provider parses identically"
                    text={judgePrompt}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </GamePanel>

        {/* 6 · Deep Debate pipeline */}
        <GamePanel title="6 · Deep Debate, step by step">
          <ol className="space-y-3">
            <Step n={1} title="Search">
              The server queries the search engine (Brave) with your topic and normalizes the
              top results into numbered sources: title, URL, snippet. Engine, result count and
              per-query fee are configuration, not code.
            </Step>
            <Step n={2} title="Rank">
              A 20-result pool is re-ranked before the model sees it: academic and
              institutional sources (journals, .edu/.gov/.ac domains, official statistics)
              float to the top, community content and encyclopedias (Wikipedia, Reddit, …)
              sink to the bottom. Topics with no academic coverage gracefully keep the
              engine&apos;s own ranking.
            </Step>
            <Step n={3} title="Ground">
              The sources are injected into the turn prompt as the model&apos;s evidence base,
              explicitly marked as <em>untrusted data, never instructions</em>. The model must
              cite inline as [1], [2] and may not invent sources.
            </Step>
            <Step n={4} title="Verify">
              After generation the server strips any [n] marker that doesn&apos;t map to a real
              source, then narrows the attached source list to only what the model actually
              cited — so &quot;Sources · 4&quot; on a card always means four genuinely cited
              pages.
            </Step>
            <Step n={5} title="Disclose">
              Clicking an inline [n] chip opens a popup with that source&apos;s title, domain,
              quote and a link out. Each card also shows a collapsible source list, and the
              result page merges every cited source of the match into one de-duplicated list.
            </Step>
          </ol>
        </GamePanel>

        {/* 7 · What a turn looks like */}
        <GamePanel title="7 · A real Deep Debate turn (rendered by the real component)">
          <p className="mb-3 text-sm text-ink/70">
            This is the live message card component with the data of an actual development test
            turn (GPT-4o Mini, Deep Debate on, 4 of 5 sources cited — note the cost breakdown
            and the citation chips):
          </p>
          <DebateMessageCard
            speaker="modelA"
            title="GPT-4o Mini"
            subtitle="The Quick Wit · Pro"
            avatar="💨"
            color="blue"
            roundLabel="Round 1 · Opening Arguments"
            stance="pro"
            content={
              "Verifying user age on social media platforms is **essential** for protecting minors in an increasingly digital world [1]. Research indicates that while social media is not inherently detrimental, its use can exacerbate challenges to children's mental health and safety online [2].\n\nRegulators across jurisdictions are converging on the same conclusion: self-declared birthdays are not a safeguard [3]. Privacy-preserving verification — estimation on device, tokens from trusted providers — shows the trade-off between safety and anonymity is engineering, not destiny [4]."
            }
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
        <GamePanel title="8 · Cost model">
          <p className="mb-3 text-sm text-ink/70">
            Every message carries its own bill: provider-reported token usage × the per-model
            price below (estimated from text length only when a provider doesn&apos;t report
            usage — flagged with a ~). Input served from the provider&apos;s prompt cache is
            billed at the discounted <span className="font-semibold">cached</span> rate, so the
            number is the real bill. Prices live in one configurable table, never in UI code.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b-3 border-ink text-left font-heading text-xs uppercase tracking-wide text-ink/60">
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">$ / 1M input</th>
                  <th className="py-2 pr-3">$ / 1M cached</th>
                  <th className="py-2">$ / 1M output</th>
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
              · Any OpenRouter <span className="font-mono">:free</span> model bills $0; unlisted
              models fall back to ${FALLBACK_PRICE.inputCostPer1M.toFixed(2)}/$
              {FALLBACK_PRICE.outputCostPer1M.toFixed(2)} per 1M.
            </li>
            <li>
              · Deep Debate searches are free on the default engine; in hybrid mode OpenRouter
              native search adds ~${DEEP_SEARCH_COST_USD.toFixed(3)}/turn, shown as a 🔎 line in
              the cost breakdown.
            </li>
            <li>
              · Standard, cached and output rates verified against the providers&apos;
              official pages (June 2026). gpt-5.3-chat-latest has no published rate and is
              priced at its nearest confirmed neighbor (no cache discount assumed).
            </li>
            <li>
              · Cache-aware: when the provider reports cache-hit input tokens (a ♻️ on the
              cost badge), they bill at the cached rate above — so the cost is the real bill,
              not an over-estimate.
            </li>
          </ul>
        </GamePanel>

        {/* 9 · Stack & configuration */}
        <GamePanel title="9 · Stack & configuration">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                Stack
              </p>
              <ul className="space-y-1 text-sm text-ink/75">
                <li>· Next.js 15 App Router + TypeScript (strict), deployed on Vercel</li>
                <li>· Tailwind CSS theme tokens — one palette drives the whole arcade UI</li>
                <li>· Framer Motion micro-animations; WebAudio synth SFX + file overrides</li>
                <li>· Layered server code: routes → orchestrator → prompt builder → provider registry → pricing</li>
                <li>· Per-turn deadline budget keeps every call inside the platform&apos;s 60s limit</li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-heading text-sm font-extrabold uppercase tracking-wide text-ink/60">
                Server configuration
              </p>
              <ul className="space-y-1 text-xs text-ink/75">
                <li><span className="font-mono font-bold">OPENAI_API_KEY / DEEPSEEK_API_KEY / OPENROUTER_API_KEY</span> — model backends</li>
                <li><span className="font-mono font-bold">BRAVE_SEARCH_API_KEY</span> — Deep Debate web search</li>
                <li><span className="font-mono font-bold">SEARCH_PROVIDER</span> — search engine id (default: brave)</li>
                <li><span className="font-mono font-bold">SEARCH_COST_USD</span> — per-query fee shown in the HUD (default 0)</li>
                <li><span className="font-mono font-bold">DEEP_SEARCH_MODE</span> — &quot;hybrid&quot; routes OpenRouter fighters to native :online search</li>
              </ul>
              <p className="mt-2 text-xs text-ink/55">
                Scaling levers are environment variables — paid search tiers, alternate engines
                and search routing need a dashboard change, not a deploy.
              </p>
            </div>
          </div>
        </GamePanel>

        <p className="pb-2 text-center text-xs text-ink/45">
          Generated from the live codebase ·{" "}
          <Badge color="yellow" size="sm">Arcade interface, serious intelligence</Badge>
        </p>
      </div>
    </GameShell>
  );
}
