"use client";

import { useEffect, useState } from "react";

import { getModelById } from "@/lib/models/modelRegistry";
import { formatCost } from "@/lib/utils/format";
import type { DashboardData, Tally } from "@/lib/analytics/aggregate";

const modelName = (id: string) => getModelById(id)?.displayName ?? id;

const JUDGE_MODE_LABEL: Record<string, string> = {
  auto: "Auto judge",
  thirdModel: "Picked a judge",
  modelA: "Fighter A judged",
  modelB: "Fighter B judged",
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border-3 border-ink bg-surface p-4 shadow-hard-sm">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink/55">{label}</div>
      <div className="mt-1 font-heading text-2xl font-extrabold">{value}</div>
    </div>
  );
}

/** A horizontal bar list — the max-count row fills the track; the rest scale to it. */
function BarList({
  title,
  rows,
  labelOf = (k) => k,
}: {
  title: string;
  rows: Tally[];
  labelOf?: (key: string) => string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <section className="rounded-card border-3 border-ink bg-surface p-4 shadow-hard-sm">
      <h2 className="mb-3 font-heading text-sm font-extrabold uppercase tracking-wide">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-ink/55">No data yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 12).map((r) => (
            <li key={r.key} className="text-xs">
              <div className="mb-0.5 flex justify-between gap-2">
                <span className="truncate font-semibold">{labelOf(r.key)}</span>
                <span className="shrink-0 font-mono text-ink/60">{r.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border-2 border-ink bg-paper">
                <div
                  className="h-full bg-arcade-blue"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 503 ? "Analytics isn't configured yet." : `Error ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="p-6 text-sm font-semibold text-arcade-red">{error}</p>;
  if (!data) return <p className="p-6 text-sm text-ink/60">Loading analytics…</p>;

  const o = data.overview;
  const perDayMax = data.perDay.reduce((m, x) => Math.max(m, x.count), 0) || 1;
  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="mb-4 font-heading text-2xl font-extrabold uppercase">Match Analytics</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Matches" value={o.matches.toLocaleString()} />
        <StatTile label="Unique players" value={o.uniqueUsers.toLocaleString()} />
        <StatTile label="Total cost" value={formatCost(o.totalMatchCost)} />
        <StatTile label="Judge cost" value={formatCost(o.totalVerdictCost)} />
        <StatTile label="Avg rounds" value={o.avgRounds.toFixed(1)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Most-used fighters" rows={data.topFighters} labelOf={modelName} />
        <BarList title="Judge models used" rows={data.topJudges} labelOf={modelName} />
        <BarList title="Judge selection" rows={data.judgeModes} labelOf={(k) => JUDGE_MODE_LABEL[k] ?? k} />
        <BarList title="Winners" rows={data.winners} />
        <BarList title="Match mode" rows={data.modes} />
        <BarList title="Tone" rows={data.tones} />
        <BarList title="Response length" rows={data.lengths} />
      </div>

      <section className="mt-4 rounded-card border-3 border-ink bg-surface p-4 shadow-hard-sm">
        <h2 className="mb-3 font-heading text-sm font-extrabold uppercase tracking-wide">
          Matches per day
        </h2>
        {data.perDay.length === 0 ? (
          <p className="text-xs text-ink/55">No data yet.</p>
        ) : (
          <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 120 }}>
            {data.perDay.map((p) => {
              return (
                <div
                  key={p.day}
                  title={`${p.day}: ${p.count} matches · ${formatCost(p.cost)}`}
                  className="w-3 shrink-0 rounded-t border-2 border-ink bg-arcade-purple"
                  style={{ height: `${Math.max(4, Math.round((p.count / perDayMax) * 110))}px` }}
                />
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[10px] text-ink/45">Deep Debate share: {(data.deepShare * 100).toFixed(0)}%</p>
      </section>
    </main>
  );
}
