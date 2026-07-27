"use client";

/**
 * CostEstimator — "what would this match cost?" calculator. Uses the SAME
 * sources the billing engine uses (pricing table via getModelPrice, length
 * presets via lengthPreset, judge choice via previewAutoJudge) so the estimate
 * can't drift from real billing. The token model is an honest upper bound:
 * ~70% of each turn's output cap, with the transcript growing every turn.
 */

import { useMemo, useState } from "react";

import { useT } from "@/lib/i18n/LocaleProvider";
import {
  BRANDS,
  MODEL_CATALOG,
  getModelById,
  modelsForBrand,
  previewAutoJudge,
} from "@/lib/models/modelRegistry";
import { getModelPrice } from "@/lib/cost/pricing";
import { lengthPreset } from "@/lib/debate/promptBuilder";
import { defaultFighters } from "@/lib/state/ArenaContext";
import type { ResponseLength, RoundCount } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";

const BASE_PROMPT_TOKENS = 650; // system + turn template, rough
const DEEP_SOURCES_TOKENS = 450; // injected source block, rough
const OUTPUT_UTILIZATION = 0.7; // models rarely hit the full cap
const DEEP_OUTPUT_CAP = 1500; // fixed Deep Debate template cap
const JUDGE_OUTPUT_TOKENS = 700;

function money(n: number): string {
  if (n === 0) return "$0.00";
  return `$${n.toFixed(n >= 0.1 ? 2 : 4)}`;
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
        active ? "bg-arcade-green text-night shadow-hard-sm" : "bg-surface",
        !disabled && !active && "hover:bg-arcade-yellow hover:text-night",
      )}
    >
      {children}
    </button>
  );
}

function FighterSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-ink/50">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-btn border-3 border-ink bg-surface px-2.5 py-1.5 text-sm font-bold outline-none focus-visible:outline-3 focus-visible:outline-offset-2"
      >
        {BRANDS.map((b) => (
          <optgroup key={b.brand} label={b.brand}>
            {modelsForBrand(b.brand).map((m) => (
              <option key={m.id} value={m.id}>
                {m.avatar} {m.displayName} · {m.debateRating}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function CostEstimator() {
  const d = useT();
  const defaults = useMemo(() => defaultFighters(), []);
  const [aId, setAId] = useState(defaults.a.id);
  const [bId, setBId] = useState(defaults.b.id);
  const [rounds, setRounds] = useState<RoundCount>(3);
  // Default mirrors the product: matches are strictly "short" (July 2026).
  // medium/long chips stay — the report documents the ENGINE, which still
  // renders legacy medium/long sessions (same call as the 3/5/7 rounds chips).
  const [length, setLength] = useState<ResponseLength>("short");
  const [deep, setDeep] = useState(false);
  const [judgeOn, setJudgeOn] = useState(true);

  const effRounds = deep ? 3 : rounds;

  const estimate = useMemo(() => {
    const a = getModelById(aId) ?? MODEL_CATALOG[0];
    const b = getModelById(bId) ?? MODEL_CATALOG[0];
    const priceA = getModelPrice(a.providerId, a.id);
    const priceB = getModelPrice(b.providerId, b.id);

    const outputCap = deep ? DEEP_OUTPUT_CAP : lengthPreset(length).maxTokens;
    const outTokens = Math.round(outputCap * OUTPUT_UTILIZATION);

    let transcript = 0;
    let costA = 0;
    let costB = 0;
    const fighterTurns = effRounds * 2;
    for (let i = 0; i < fighterTurns; i++) {
      const inTokens = BASE_PROMPT_TOKENS + (deep ? DEEP_SOURCES_TOKENS : 0) + transcript;
      const price = i % 2 === 0 ? priceA : priceB;
      const turnCost =
        (inTokens / 1_000_000) * price.inputCostPer1M +
        (outTokens / 1_000_000) * price.outputCostPer1M;
      if (i % 2 === 0) costA += turnCost;
      else costB += turnCost;
      transcript += outTokens;
    }

    // Same neutral-judge preview the Setup page uses (all backends assumed up).
    const judge = judgeOn
      ? previewAutoJudge({ openai: true, deepseek: true, openrouter: true }, [a.id, b.id])
      : null;
    let costJudge = 0;
    if (judge) {
      const priceJ = getModelPrice(judge.providerId, judge.id);
      costJudge =
        ((BASE_PROMPT_TOKENS + transcript) / 1_000_000) * priceJ.inputCostPer1M +
        (JUDGE_OUTPUT_TOKENS / 1_000_000) * priceJ.outputCostPer1M;
    }

    return { a, b, judge, costA, costB, costJudge, fighterTurns, total: costA + costB + costJudge };
  }, [aId, bId, effRounds, length, deep, judgeOn]);

  return (
    <div className="rounded-card border-3 border-ink bg-arcade-purple/10 p-3.5">
      <p className="font-heading text-base font-extrabold">{d.report.cost.estimator.title}</p>
      <p className="mb-3 mt-1 text-xs text-ink/65">{d.report.cost.estimator.intro}</p>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <FighterSelect label={d.report.cost.estimator.fighterA} value={aId} onChange={setAId} />
          <FighterSelect label={d.report.cost.estimator.fighterB} value={bId} onChange={setBId} />
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">
              {deep ? d.report.cost.estimator.roundsLocked : d.report.cost.estimator.rounds}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {([3, 5, 7] as const).map((r) => (
                <Chip key={r} active={effRounds === r} disabled={deep} onClick={() => setRounds(r)}>
                  {d.report.playground.roundsLabel(r)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">
              {deep ? d.report.cost.estimator.lengthLocked : d.report.cost.estimator.length}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(["short", "medium", "long"] as const).map((l) => (
                <Chip key={l} active={!deep && length === l} disabled={deep} onClick={() => setLength(l)}>
                  {d.report.playground.lengthLabel(l, lengthPreset(l).maxTokens)}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">
                {d.report.cost.estimator.deep}
              </p>
              <div className="flex gap-1.5">
                <Chip active={!deep} onClick={() => setDeep(false)}>{d.report.cost.estimator.off}</Chip>
                <Chip active={deep} onClick={() => setDeep(true)}>🌐 {d.report.cost.estimator.on}</Chip>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">
                {d.report.cost.estimator.judgeKnob}
              </p>
              <div className="flex gap-1.5">
                <Chip active={!judgeOn} onClick={() => setJudgeOn(false)}>{d.report.cost.estimator.off}</Chip>
                <Chip active={judgeOn} onClick={() => setJudgeOn(true)}>⚖️ {d.report.cost.estimator.on}</Chip>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border-3 border-ink bg-night p-3.5 text-white shadow-hard-sm">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            {d.report.cost.estimator.total}
          </p>
          <p className="font-display text-3xl text-arcade-green">{money(estimate.total)}</p>
        </div>
        <dl className="space-y-0.5 font-mono text-xs text-white/80">
          <div className="flex justify-between gap-4">
            <dt>
              {estimate.a.avatar} {estimate.a.displayName}
            </dt>
            <dd>{money(estimate.costA)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>
              {estimate.b.avatar} {estimate.b.displayName}
            </dt>
            <dd>{money(estimate.costB)}</dd>
          </div>
          {estimate.judge ? (
            <div className="flex justify-between gap-4">
              <dt>{d.report.cost.estimator.judgeLine(estimate.judge.displayName)}</dt>
              <dd>{money(estimate.costJudge)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 text-white/50">
            <dt>{d.report.cost.estimator.turnsLine(estimate.fighterTurns)}</dt>
            <dd />
          </div>
        </dl>
      </div>
      <p className="mt-2 text-[11px] text-ink/55">{d.report.cost.estimator.disclaimer}</p>
    </div>
  );
}
