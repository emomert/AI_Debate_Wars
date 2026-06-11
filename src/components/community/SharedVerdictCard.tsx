"use client";

/**
 * SharedVerdictCard — the AI verdict on a shared match page (docs/20). A
 * cost-free sibling of result/VerdictCard rendering from the sanitized
 * SharedVerdict: fighter names may be masked, the judge may be anonymous, and
 * there is never cost/usage data to show.
 */

import type { SharedSnapshot } from "@/lib/community/types";
import { Badge } from "@/components/game/Badge";
import { MarkdownText } from "@/components/debate/MarkdownText";
import { ScoreBreakdown } from "@/components/result/ScoreBreakdown";
import { useT } from "@/lib/i18n/LocaleProvider";

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

export function SharedVerdictCard({ snapshot }: { snapshot: SharedSnapshot }) {
  const d = useT();
  const verdict = snapshot.verdict;
  if (!verdict) return null;

  const nameA = snapshot.fighters.a.name ?? d.community.match.fighterA;
  const nameB = snapshot.fighters.b.name ?? d.community.match.fighterB;

  const winnerLabel = (() => {
    switch (verdict.winner) {
      case "modelA":
        return d.result.verdict.takesIt(nameA);
      case "modelB":
        return d.result.verdict.takesIt(nameB);
      case "tie":
        return d.result.verdict.draw;
      default:
        return d.result.verdict.discussionComplete;
    }
  })();

  return (
    <section
      className="relative overflow-hidden rounded-panel border-4 border-ink bg-arcade-purple p-1 shadow-hard-lg"
      aria-label="AI verdict"
    >
      <div className="rounded-[20px] border-3 border-ink bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-block -rotate-2 rounded-btn border-3 border-ink bg-arcade-yellow px-3 py-1 font-display text-3xl tracking-tight text-night sm:text-4xl">
            {d.result.verdict.badge}
          </h2>
          <Badge color="purple">
            {d.result.verdict.judge(verdict.judgeName ?? d.community.match.anonymousJudge)}
          </Badge>
        </div>

        <p className="mt-4 font-heading text-xl font-extrabold sm:text-2xl">{winnerLabel}</p>
        {verdict.winnerArgument ? (
          <p className="mt-1 text-sm text-ink/80 sm:text-base">
            <span className="font-bold">{d.result.verdict.winningArgument}</span>
            {verdict.winnerArgument}
          </p>
        ) : null}

        <div className="mt-3 rounded-card border-3 border-ink bg-surface p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink/45">
            {d.result.verdict.whyThis}
          </p>
          <MarkdownText content={verdict.summary} />
        </div>

        {verdict.scoreModelA !== undefined ? (
          <div className="mt-4">
            <ScoreBreakdown
              nameA={nameA}
              nameB={nameB}
              scoreA={verdict.scoreModelA}
              scoreB={verdict.scoreModelB}
            />
          </div>
        ) : null}

        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Insight label={d.result.verdict.strongest(nameA)} value={verdict.strongestModelA} tone="good" />
          <Insight label={d.result.verdict.strongest(nameB)} value={verdict.strongestModelB} tone="good" />
          <Insight label={d.result.verdict.weakest(nameA)} value={verdict.weakestModelA} tone="risk" />
          <Insight label={d.result.verdict.weakest(nameB)} value={verdict.weakestModelB} tone="risk" />
        </ul>
      </div>
    </section>
  );
}
