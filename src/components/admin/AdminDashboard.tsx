"use client";

/**
 * AdminDashboard — owner-only "mission control" (deliberately NOT the arcade
 * design system; only the owner ever sees this page). Fetches the raw
 * dimensions-only cards once, then every interaction — time range, dimension
 * filters (click any breakdown row), charts — recomputes instantly in the
 * browser via the pure buildDashboard aggregator. Provider panels show spend
 * per billed API key (OpenAI / DeepSeek / OpenRouter / Brave search).
 */

import { useEffect, useMemo, useState } from "react";

import { getModelById } from "@/lib/models/modelRegistry";
import {
  buildDashboard,
  type ProviderCosts,
  type StoredMatchCard,
  type Tally,
} from "@/lib/analytics/aggregate";

/* ── Formatting ──────────────────────────────────────────────────────────── */

const modelName = (id: string) => getModelById(id)?.displayName ?? id;

const usd = (n: number) =>
  n >= 1 ? `$${n.toFixed(2)}` : n >= 0.01 ? `$${n.toFixed(3)}` : `$${n.toFixed(4)}`;

const JUDGE_MODE_LABEL: Record<string, string> = {
  auto: "Auto judge",
  thirdModel: "Picked a judge",
  modelA: "Fighter A judged",
  modelB: "Fighter B judged",
};

const WINNER_LABEL: Record<string, string> = {
  modelA: "Fighter A side",
  modelB: "Fighter B side",
  tie: "Tie",
  not_applicable: "No contest",
  none: "No verdict",
};

/* ── Providers (API keys) ────────────────────────────────────────────────── */

const PROVIDERS: { key: keyof ProviderCosts; label: string; color: string }[] = [
  { key: "openai", label: "OpenAI key", color: "#10b981" },
  { key: "deepseek", label: "DeepSeek key", color: "#38bdf8" },
  { key: "openrouter", label: "OpenRouter key", color: "#a78bfa" },
  { key: "search", label: "Brave search", color: "#fb923c" },
];

/* ── Filters ─────────────────────────────────────────────────────────────── */

type FilterKey = "fighter" | "judge" | "judgeMode" | "tone" | "length" | "winner" | "language";
type Filters = Partial<Record<FilterKey, string>>;

const FILTER_LABEL: Record<FilterKey, string> = {
  fighter: "Fighter",
  judge: "Judge",
  judgeMode: "Judge selection",
  tone: "Tone",
  length: "Length",
  winner: "Winner side",
  language: "Language",
};

function matchesFilters(c: StoredMatchCard, f: Filters): boolean {
  if (f.fighter && c.model_a_id !== f.fighter && c.model_b_id !== f.fighter) return false;
  if (f.judge && c.judge_model_id !== f.judge) return false;
  if (f.judgeMode && c.judge_mode !== f.judgeMode) return false;
  if (f.tone && c.tone !== f.tone) return false;
  if (f.length && c.response_length !== f.length) return false;
  if (f.winner && (c.winner ?? "none") !== f.winner) return false;
  if (f.language && (c.language || "en") !== f.language) return false;
  return true;
}

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 0 },
] as const;

/* ── Small building blocks ───────────────────────────────────────────────── */

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-slate-100">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

/** Clickable breakdown list — clicking a row toggles that value as a filter. */
function Breakdown({
  title,
  rows,
  active,
  onPick,
  labelOf = (k) => k,
}: {
  title: string;
  rows: Tally[];
  active?: string;
  onPick: (key: string) => void;
  labelOf?: (key: string) => string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-600">No data in this view.</p>
      ) : (
        <ul className="space-y-1">
          {rows.slice(0, 10).map((r) => {
            const selected = active === r.key;
            return (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => onPick(r.key)}
                  title={selected ? "Click to clear this filter" : "Click to filter by this"}
                  className={`group block w-full rounded-md px-2 py-1 text-left transition ${
                    selected ? "bg-sky-500/15 ring-1 ring-sky-500/50" : "hover:bg-slate-800/70"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2 text-xs">
                    <span className={`truncate ${selected ? "text-sky-300" : "text-slate-300"}`}>
                      {labelOf(r.key)}
                    </span>
                    <span className="shrink-0 font-mono text-slate-500">{r.count}</span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded bg-slate-800">
                    <span
                      className={`block h-full ${selected ? "bg-sky-400" : "bg-slate-500 group-hover:bg-slate-400"}`}
                      style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ── Charts (pure SVG, native tooltips) ──────────────────────────────────── */

function MatchesPerDayChart({ perDay }: { perDay: { day: string; count: number }[] }) {
  const H = 96;
  const max = perDay.reduce((m, p) => Math.max(m, p.count), 0) || 1;
  if (perDay.length === 0) return <p className="text-xs text-slate-600">No matches in this view.</p>;
  const labelEvery = Math.ceil(perDay.length / 8);
  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(perDay.length * 14, 200)} height={H + 18} role="img" aria-label="Matches per day">
        {perDay.map((p, i) => {
          const h = Math.max(2, Math.round((p.count / max) * H));
          return (
            <g key={p.day}>
              <rect
                x={i * 14 + 2}
                y={H - h}
                width={10}
                height={h}
                rx={2}
                className="fill-sky-500/80 hover:fill-sky-300"
              >
                <title>{`${p.day} — ${p.count} match${p.count === 1 ? "" : "es"}`}</title>
              </rect>
              {i % labelEvery === 0 ? (
                <text x={i * 14 + 7} y={H + 13} textAnchor="middle" className="fill-slate-600 text-[8px]">
                  {p.day.slice(5)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProviderSpendChart({ perDay }: { perDay: { day: string; providers: ProviderCosts }[] }) {
  const H = 96;
  const totals = perDay.map((p) => PROVIDERS.reduce((s, pr) => s + p.providers[pr.key], 0));
  const max = totals.reduce((m, t) => Math.max(m, t), 0);
  if (perDay.length === 0 || max <= 0) {
    return (
      <p className="text-xs text-slate-600">
        No recorded per-key spend in this view (matches from before per-key tracking count as $0).
      </p>
    );
  }
  const labelEvery = Math.ceil(perDay.length / 8);
  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(perDay.length * 14, 200)} height={H + 18} role="img" aria-label="Provider spend per day">
        {perDay.map((p, i) => {
          let y = H;
          const total = PROVIDERS.reduce((s, pr) => s + p.providers[pr.key], 0);
          return (
            <g key={p.day}>
              {PROVIDERS.map((pr) => {
                const v = p.providers[pr.key];
                if (v <= 0) return null;
                const h = Math.max(1, Math.round((v / max) * H));
                y -= h;
                return (
                  <rect key={pr.key} x={i * 14 + 2} y={y} width={10} height={h} fill={pr.color}>
                    <title>{`${p.day} — ${pr.label}: ${usd(v)} (day total ${usd(total)})`}</title>
                  </rect>
                );
              })}
              {i % labelEvery === 0 ? (
                <text x={i * 14 + 7} y={H + 13} textAnchor="middle" className="fill-slate-600 text-[8px]">
                  {p.day.slice(5)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function AdminDashboard() {
  const [cards, setCards] = useState<StoredMatchCard[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [filters, setFilters] = useState<Filters>({});
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/admin/analytics")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(
            r.status === 503
              ? "Analytics isn't configured (SUPABASE_SERVICE_ROLE_KEY missing)."
              : `Error ${r.status}`,
          );
        }
        return r.json();
      })
      .then((data: { cards: StoredMatchCard[]; truncated: boolean }) => {
        if (cancelled) return;
        setCards(data.cards);
        setTruncated(data.truncated);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const filtered = useMemo(() => {
    if (!cards) return [];
    const cutoff = rangeDays > 0 ? Date.now() - rangeDays * 86_400_000 : 0;
    return cards.filter(
      (c) => (!cutoff || new Date(c.created_at).getTime() >= cutoff) && matchesFilters(c, filters),
    );
  }, [cards, rangeDays, filters]);

  const d = useMemo(() => buildDashboard(filtered), [filtered]);

  const toggle = (key: FilterKey) => (value: string) =>
    setFilters((f) => ({ ...f, [key]: f[key] === value ? undefined : value }));

  const activeFilters = (Object.entries(filters) as [FilterKey, string | undefined][]).filter(
    (e): e is [FilterKey, string] => Boolean(e[1]),
  );

  const labelForFilter = (k: FilterKey, v: string) =>
    k === "fighter" || k === "judge"
      ? modelName(v)
      : k === "judgeMode"
        ? (JUDGE_MODE_LABEL[v] ?? v)
        : k === "winner"
          ? (WINNER_LABEL[v] ?? v)
          : v;

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-8">
        <p className="font-mono text-sm text-rose-400">{error}</p>
      </main>
    );
  }
  if (!cards) {
    return (
      <main className="min-h-screen bg-slate-950 p-8">
        <p className="animate-pulse font-mono text-sm text-slate-500">Loading analytics…</p>
      </main>
    );
  }

  const o = d.overview;
  const pc = d.providerCosts;
  const keyTotal = PROVIDERS.reduce((s, p) => s + pc[p.key], 0);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-200 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header: title, range picker, refresh */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-lg font-semibold tracking-tight text-slate-100">
            Debator · Mission Control
          </h1>
          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRangeDays(r.days)}
                className={`rounded-md px-3 py-1 font-mono text-xs transition ${
                  rangeDays === r.days ? "bg-sky-500/20 text-sky-300" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-400 transition hover:text-slate-200"
          >
            ↻ Refresh
          </button>
        </div>

        {activeFilters.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeFilters.map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, [k]: undefined }))}
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-500/20"
              >
                <span className="text-sky-500">{FILTER_LABEL[k]}:</span> {labelForFilter(k, v)}
                <span aria-hidden>×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters({})}
              className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
            >
              Clear all
            </button>
          </div>
        ) : null}

        {truncated ? (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Showing the most recent 20,000 matches — older ones aren't included in these numbers.
          </p>
        ) : null}

        {/* Overview tiles */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatTile
            label="Matches"
            value={o.matches.toLocaleString()}
            sub={`${(d.deepShare * 100).toFixed(0)}% deep debate`}
          />
          <StatTile label="Players" value={o.uniqueUsers.toLocaleString()} sub="signed-in, distinct" />
          <StatTile label="Total cost" value={usd(o.totalMatchCost)} sub="all providers" />
          <StatTile label="Judge cost" value={usd(o.totalVerdictCost)} sub="verdict calls" />
          <StatTile label="Avg rounds" value={o.avgRounds.toFixed(1)} />
        </div>

        {/* API-key spend */}
        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <Panel title="Spend by API key">
            {keyTotal <= 0 ? (
              <p className="text-xs text-slate-600">
                No per-key spend recorded in this view. (Matches from before per-key tracking count as $0 here.)
              </p>
            ) : (
              <ul className="space-y-2.5">
                {PROVIDERS.map((p) => {
                  const v = pc[p.key];
                  const share = keyTotal > 0 ? v / keyTotal : 0;
                  return (
                    <li key={p.key}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-300">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                          {p.label}
                        </span>
                        <span className="font-mono text-slate-300">
                          {usd(v)} <span className="text-slate-600">· {(share * 100).toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
                        <div
                          className="h-full"
                          style={{ width: `${Math.round(share * 100)}%`, background: p.color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel title="Spend per day, by API key">
            <ProviderSpendChart perDay={d.perDay} />
            <div className="mt-2 flex flex-wrap gap-3">
              {PROVIDERS.map((p) => (
                <span key={p.key} className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
                  {p.label}
                </span>
              ))}
            </div>
          </Panel>
        </div>

        {/* Matches per day */}
        <div className="mb-4">
          <Panel title="Matches per day">
            <MatchesPerDayChart perDay={d.perDay} />
          </Panel>
        </div>

        {/* Interactive breakdowns — click any row to filter everything */}
        <p className="mb-2 text-[11px] text-slate-600">
          Click any row below to filter the whole dashboard by it; click again (or use the chips above) to clear.
        </p>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Breakdown
            title="Most-used fighters"
            rows={d.topFighters}
            active={filters.fighter}
            onPick={toggle("fighter")}
            labelOf={modelName}
          />
          <Breakdown
            title="Most-winning models"
            rows={d.winningModels}
            active={filters.fighter}
            onPick={toggle("fighter")}
            labelOf={modelName}
          />
          <Breakdown
            title="Judges used"
            rows={d.topJudges}
            active={filters.judge}
            onPick={toggle("judge")}
            labelOf={modelName}
          />
          <Breakdown
            title="Judge selection"
            rows={d.judgeModes}
            active={filters.judgeMode}
            onPick={toggle("judgeMode")}
            labelOf={(k) => JUDGE_MODE_LABEL[k] ?? k}
          />
          <Breakdown
            title="Winner side"
            rows={d.winners}
            active={filters.winner}
            onPick={toggle("winner")}
            labelOf={(k) => WINNER_LABEL[k] ?? k}
          />
          <Breakdown title="Tone" rows={d.tones} active={filters.tone} onPick={toggle("tone")} />
          <Breakdown
            title="Response length"
            rows={d.lengths}
            active={filters.length}
            onPick={toggle("length")}
          />
          <Breakdown
            title="Language"
            rows={d.languages}
            active={filters.language}
            onPick={toggle("language")}
          />
        </div>

        {/* Recent matches */}
        <Panel title={`Recent matches (${Math.min(filtered.length, 15)} of ${filtered.length})`}>
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-600">Nothing matches the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-1.5 pr-3 font-medium">When (UTC)</th>
                    <th className="py-1.5 pr-3 font-medium">Fighters</th>
                    <th className="py-1.5 pr-3 font-medium">Judge</th>
                    <th className="py-1.5 pr-3 font-medium">Winner</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 15).map((c) => {
                    const winnerName =
                      c.winner === "modelA"
                        ? modelName(c.model_a_id)
                        : c.winner === "modelB"
                          ? modelName(c.model_b_id)
                          : (WINNER_LABEL[c.winner ?? "none"] ?? "—");
                    return (
                      <tr key={c.app_session_id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                        <td className="py-1.5 pr-3 font-mono text-slate-500">
                          {c.created_at.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-1.5 pr-3 text-slate-300">
                          {modelName(c.model_a_id)} <span className="text-slate-600">vs</span>{" "}
                          {modelName(c.model_b_id)}
                          {c.deep_debate ? (
                            <span className="ml-1.5 text-[9px] text-emerald-400">DEEP</span>
                          ) : null}
                        </td>
                        <td className="py-1.5 pr-3 text-slate-400">{modelName(c.judge_model_id)}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{winnerName}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-slate-400">
                          {usd(Number(c.match_cost) || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <p className="mt-4 text-[10px] text-slate-700">
          Dimensions only — no topics or transcripts are stored. Per-key spend exists for matches recorded
          after migration 0010; older matches count as $0 in the key panels.
        </p>
      </div>
    </main>
  );
}
