"use client";

/**
 * FinalSummaryCard — the closing scoreboard (docs/02 Final Result Page): match
 * recap, total cost summary and a per-fighter cost split.
 */

import { useMemo } from "react";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { GamePanel } from "@/components/game/GamePanel";
import { Badge } from "@/components/game/Badge";
import { ROUND_OPTIONS } from "@/lib/constants";
import { formatCost, formatTokens } from "@/lib/utils/format";

interface FinalSummaryCardProps {
  session: DebateSession;
}

export function FinalSummaryCard({ session }: FinalSummaryCardProps) {
  const split = useMemo(() => {
    let a = 0;
    let b = 0;
    for (const m of session.messages) {
      const c = m.cost?.totalCost ?? 0;
      if (m.speaker === "modelA") a += c;
      else if (m.speaker === "modelB") b += c;
    }
    return { a, b };
  }, [session.messages]);

  const cost = session.costSummary;
  // Includes verdicts replaced by a re-judge — they were paid for too, and the
  // split below must keep reconciling with the Total.
  const judgeCost =
    (session.verdict?.cost?.totalCost ?? 0) +
    (session.pastVerdicts ?? []).reduce((sum, v) => sum + (v.cost?.totalCost ?? 0), 0);

  // Costs are the real provider-reported bill unless some turn fell back to a
  // text-length estimate (no usage returned) — only then is it "Estimated".
  const anyEstimated =
    session.messages.some((m) => m.cost?.estimated) ||
    Boolean(session.verdict?.cost?.estimated) ||
    (session.pastVerdicts ?? []).some((v) => v.cost?.estimated);
  const roundLabel = ROUND_OPTIONS.find((r) => r.count === session.roundCount)?.label;

  return (
    <GamePanel title="📊 Match Summary">
      <div className="rounded-card border-3 border-ink bg-paper p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink/45">Topic</p>
        <p className="mt-0.5 font-semibold">{session.topic}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge color={session.mode === "debate" ? "red" : "purple"} size="sm">
          {session.mode === "debate" ? "⚔️ Debate" : "🧠 Discussion"}
        </Badge>
        <Badge color="white" size="sm">{session.roundCount} · {roundLabel}</Badge>
        <Badge color="white" size="sm">Tone: {session.tone}</Badge>
        <Badge color="white" size="sm">{session.messages.length} messages</Badge>
        <Badge color={session.judge.enabled ? "purple" : "white"} size="sm">
          {session.judge.enabled ? "⚖️ Judged" : "No judge"}
        </Badge>
      </div>

      {/* Cost summary */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total cost" value={formatCost(cost.totalCost)} accent />
        <Stat label="Total tokens" value={formatTokens(cost.totalTokens)} />
        <Stat label="Input tokens" value={formatTokens(cost.totalInputTokens)} />
        <Stat label="Output tokens" value={formatTokens(cost.totalOutputTokens)} />
      </div>

      {/* Per-fighter (and judge) split — reconciles with the Total above. */}
      <div
        className={
          "mt-3 grid gap-2 " + (session.verdict ? "grid-cols-3" : "grid-cols-2")
        }
      >
        <div className="rounded-card border-3 border-ink bg-surface p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-arcade-blue">
            A · {session.modelA.displayName}
          </p>
          <p className="mt-0.5 font-mono text-base font-bold sm:text-lg">{formatCost(split.a)}</p>
        </div>
        <div className="rounded-card border-3 border-ink bg-surface p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-arcade-red">
            B · {session.modelB.displayName}
          </p>
          <p className="mt-0.5 font-mono text-base font-bold sm:text-lg">{formatCost(split.b)}</p>
        </div>
        {session.verdict ? (
          <div className="rounded-card border-3 border-ink bg-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-arcade-purple">
              ⚖️ Judge
            </p>
            <p className="mt-0.5 font-mono text-base font-bold sm:text-lg">{formatCost(judgeCost)}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-center text-[11px] text-ink/50">
        {anyEstimated ? "Estimated · " : ""}Pricing is configurable in{" "}
        <code className="font-mono">lib/cost/pricing.ts</code>
      </p>
    </GamePanel>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  // Accent stat sits on solid green → constant `night` text in both themes.
  return (
    <div
      className={
        "rounded-card border-3 border-ink p-2.5 text-center " +
        (accent ? "bg-arcade-green text-night" : "bg-surface")
      }
    >
      <p
        className={
          "text-[10px] font-bold uppercase tracking-wide " +
          (accent ? "text-night/60" : "text-ink/50")
        }
      >
        {label}
      </p>
      <p className="mt-0.5 font-mono text-base font-bold">{value}</p>
    </div>
  );
}
