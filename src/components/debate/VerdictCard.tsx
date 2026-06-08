"use client";

/**
 * VerdictCard — the dramatic final reveal (docs/02, docs/09). Yellow/purple
 * arcade "VERDICT" header, winner, summary, strongest/weakest per side, a score
 * breakdown and the judge's cost.
 */

import { motion, useReducedMotion } from "framer-motion";

import type { DebateVerdict, SelectedModel } from "@/lib/debate/debateTypes";
import { Badge } from "@/components/game/Badge";
import { CostBadge } from "@/components/debate/CostBadge";
import { MarkdownText } from "@/components/debate/MarkdownText";
import { ScoreBreakdown } from "@/components/result/ScoreBreakdown";
import { getModelById } from "@/lib/models/modelRegistry";
import { useT } from "@/lib/i18n/LocaleProvider";

interface VerdictCardProps {
  verdict: DebateVerdict;
  modelA: SelectedModel;
  modelB: SelectedModel;
}

/** Resolve a judge model id to a friendly display name. */
function judgeDisplayName(id: string): string {
  return getModelById(id)?.displayName ?? id;
}

function Insight({
  label,
  value,
  tone,
}: {
  label: string;
  value?: string;
  tone: "good" | "risk";
}) {
  if (!value) return null;
  return (
    <li className="rounded-card border-3 border-ink bg-surface p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink/45">
        {tone === "good" ? "💪 " : "⚠️ "}
        {label}
      </p>
      <p className="mt-0.5 text-sm">{value}</p>
    </li>
  );
}

export function VerdictCard({ verdict, modelA, modelB }: VerdictCardProps) {
  const reduce = useReducedMotion();
  const d = useT();
  const winnerLabel = (() => {
    switch (verdict.winner) {
      case "modelA":
        return d.result.verdict.takesIt(modelA.displayName);
      case "modelB":
        return d.result.verdict.takesIt(modelB.displayName);
      case "tie":
        return d.result.verdict.draw;
      default:
        return d.result.verdict.discussionComplete;
    }
  })();
  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-panel border-4 border-ink bg-arcade-purple p-1 shadow-hard-lg"
      aria-label="Final verdict"
    >
      <div className="rounded-[20px] border-3 border-ink bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <motion.h2
            initial={reduce ? false : { rotate: -3, scale: 0.9 }}
            animate={{ rotate: -2, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 12 }}
            className="inline-block rounded-btn border-3 border-ink bg-arcade-yellow px-3 py-1 font-display text-3xl tracking-tight text-night sm:text-4xl"
          >
            {d.result.verdict.badge}
          </motion.h2>
          <Badge color="purple">{d.result.verdict.judge(judgeDisplayName(verdict.judgeModelId))}</Badge>
        </div>

        <p className="mt-4 font-heading text-xl font-extrabold sm:text-2xl">
          {winnerLabel}
        </p>
        {verdict.winnerArgument ? (
          <p className="mt-1 text-sm text-ink/80 sm:text-base">
            <span className="font-bold">{d.result.verdict.winningArgument}</span>
            {verdict.winnerArgument}
          </p>
        ) : null}

        {/* Why the judge decided this way (leans to the winner; **bold** the
            decisive points). */}
        <div className="mt-3 rounded-card border-3 border-ink bg-surface p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink/45">
            {d.result.verdict.whyThis}
          </p>
          <MarkdownText content={verdict.summary} />
        </div>

        {verdict.scoreModelA !== undefined ? (
          <div className="mt-4">
            <ScoreBreakdown
              nameA={modelA.displayName}
              nameB={modelB.displayName}
              scoreA={verdict.scoreModelA}
              scoreB={verdict.scoreModelB}
            />
          </div>
        ) : null}

        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Insight label={d.result.verdict.strongest(modelA.displayName)} value={verdict.strongestModelA} tone="good" />
          <Insight label={d.result.verdict.strongest(modelB.displayName)} value={verdict.strongestModelB} tone="good" />
          <Insight label={d.result.verdict.weakest(modelA.displayName)} value={verdict.weakestModelA} tone="risk" />
          <Insight label={d.result.verdict.weakest(modelB.displayName)} value={verdict.weakestModelB} tone="risk" />
        </ul>

        <div className="mt-4">
          <CostBadge cost={verdict.cost} usage={verdict.usage} latencyMs={verdict.latencyMs} />
        </div>
      </div>
    </motion.section>
  );
}
