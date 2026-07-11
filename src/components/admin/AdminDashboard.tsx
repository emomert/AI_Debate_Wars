"use client";

/**
 * AdminDashboard — owner-only "mission control" (deliberately NOT the arcade
 * design system; only the owner ever sees this page). Light-themed. Fetches the
 * raw dimensions-only cards + the API error log once, then every interaction —
 * time range, dimension filters (click any breakdown row) — recomputes
 * instantly in the browser via the pure buildDashboard aggregator. Provider
 * panels show spend per billed API key; the error panel surfaces recurring
 * failures (e.g. a model that keeps timing out).
 */

import { useEffect, useMemo, useState } from "react";

import { getModelById } from "@/lib/models/modelRegistry";
import {
  buildDashboard,
  type ProviderCosts,
  type StoredMatchCard,
  type Tally,
} from "@/lib/analytics/aggregate";
import type { ApiErrorRow } from "@/lib/analytics/errorLog";

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
  { key: "openai", label: "OpenAI key", color: "#059669" },
  { key: "deepseek", label: "DeepSeek key", color: "#0284c7" },
  { key: "openrouter", label: "OpenRouter key", color: "#7c3aed" },
  { key: "search", label: "Brave search", color: "#ea580c" },
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
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-gray-900">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-gray-400">{sub}</div> : null}
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
        <p className="text-xs text-gray-400">No data in this view.</p>
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
                    selected ? "bg-sky-50 ring-1 ring-sky-400" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2 text-xs">
                    <span className={`truncate ${selected ? "font-semibold text-sky-700" : "text-gray-700"}`}>
                      {labelOf(r.key)}
                    </span>
                    <span className="shrink-0 font-mono text-gray-400">{r.count}</span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded bg-gray-100">
                    <span
                      className={`block h-full ${selected ? "bg-sky-500" : "bg-gray-300 group-hover:bg-gray-400"}`}
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
  if (perDay.length === 0) return <p className="text-xs text-gray-400">No matches in this view.</p>;
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
                className="fill-sky-500 hover:fill-sky-400"
              >
                <title>{`${p.day} — ${p.count} match${p.count === 1 ? "" : "es"}`}</title>
              </rect>
              {i % labelEvery === 0 ? (
                <text x={i * 14 + 7} y={H + 13} textAnchor="middle" className="fill-gray-400 text-[8px]">
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
      <p className="text-xs text-gray-400">
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
                <text x={i * 14 + 7} y={H + 13} textAnchor="middle" className="fill-gray-400 text-[8px]">
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
  const [apiErrors, setApiErrors] = useState<ApiErrorRow[]>([]);
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
      .then((data: { cards: StoredMatchCard[]; truncated: boolean; errors?: ApiErrorRow[] }) => {
        if (cancelled) return;
        setCards(data.cards);
        setTruncated(data.truncated);
        setApiErrors(data.errors ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const cutoff = rangeDays > 0 ? Date.now() - rangeDays * 86_400_000 : 0;

  const filtered = useMemo(() => {
    if (!cards) return [];
    return cards.filter(
      (c) => (!cutoff || new Date(c.created_at).getTime() >= cutoff) && matchesFilters(c, filters),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, cutoff, filters]);

  const d = useMemo(() => buildDashboard(filtered), [filtered]);

  // Errors respect the time range (and the fighter/judge filter via model id).
  const errsInView = useMemo(() => {
    const modelFilter = filters.fighter ?? filters.judge;
    return apiErrors.filter(
      (e) =>
        (!cutoff || new Date(e.created_at).getTime() >= cutoff) &&
        (!modelFilter || e.model_id === modelFilter),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiErrors, cutoff, filters.fighter, filters.judge]);

  const errCodeTallies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of errsInView) counts.set(e.code, (counts.get(e.code) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [errsInView]);

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
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="font-mono text-sm text-rose-600">{error}</p>
      </main>
    );
  }
  if (!cards) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="animate-pulse font-mono text-sm text-gray-400">Loading analytics…</p>
      </main>
    );
  }

  const o = d.overview;
  const pc = d.providerCosts;
  const keyTotal = PROVIDERS.reduce((s, p) => s + pc[p.key], 0);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-800 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header: title, range picker, refresh */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-lg font-semibold tracking-tight text-gray-900">
            Debator · Mission Control
          </h1>
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRangeDays(r.days)}
                className={`rounded-md px-3 py-1 font-mono text-xs transition ${
                  rangeDays === r.days ? "bg-sky-100 text-sky-700" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-xs text-gray-500 shadow-sm transition hover:text-gray-800"
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
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-100"
              >
                <span className="text-sky-500">{FILTER_LABEL[k]}:</span> {labelForFilter(k, v)}
                <span aria-hidden>×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters({})}
              className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        ) : null}

        {truncated ? (
          <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
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
              <p className="text-xs text-gray-400">
                No per-key spend recorded in this view. (Matches from before per-key tracking count as $0
                here.)
              </p>
            ) : (
              <ul className="space-y-2.5">
                {PROVIDERS.map((p) => {
                  const v = pc[p.key];
                  const share = keyTotal > 0 ? v / keyTotal : 0;
                  return (
                    <li key={p.key}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="flex items-center gap-2 text-gray-700">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                          {p.label}
                        </span>
                        <span className="font-mono text-gray-700">
                          {usd(v)} <span className="text-gray-400">· {(share * 100).toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
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
                <span key={p.key} className="inline-flex items-center gap-1.5 text-[10px] text-gray-500">
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

        {/* Errors */}
        <div className="mb-4">
          <Panel
            title={`API errors (${errsInView.length} in range)`}
            right={
              errCodeTallies.length > 0 ? (
                <span className="flex flex-wrap justify-end gap-1.5">
                  {errCodeTallies.slice(0, 4).map(([code, n]) => (
                    <span
                      key={code}
                      className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700"
                    >
                      {code} × {n}
                    </span>
                  ))}
                </span>
              ) : null
            }
          >
            {errsInView.length === 0 ? (
              <p className="text-xs text-gray-400">No API errors in this range. 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-400">
                      <th className="py-1.5 pr-3 font-medium">When (UTC)</th>
                      <th className="py-1.5 pr-3 font-medium">Route</th>
                      <th className="py-1.5 pr-3 font-medium">Code</th>
                      <th className="py-1.5 pr-3 font-medium">Model</th>
                      <th className="py-1.5 pr-3 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errsInView.slice(0, 12).map((e, i) => (
                      <tr key={`${e.created_at}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-1.5 pr-3 font-mono text-gray-400">
                          {e.created_at.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-gray-600">{e.route}</td>
                        <td className="py-1.5 pr-3">
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] text-rose-700">
                            {e.code}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-gray-600">{e.model_id ? modelName(e.model_id) : "—"}</td>
                        <td className="max-w-[26rem] truncate py-1.5 pr-3 text-gray-500" title={e.message}>
                          {e.message || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Interactive breakdowns — click any row to filter everything */}
        <p className="mb-2 text-[11px] text-gray-400">
          Click any row below to filter the whole dashboard by it; click again (or use the chips above) to
          clear.
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
            <p className="text-xs text-gray-400">Nothing matches the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-400">
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
                      <tr key={c.app_session_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-1.5 pr-3 font-mono text-gray-400">
                          {c.created_at.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-700">
                          {modelName(c.model_a_id)} <span className="text-gray-400">vs</span>{" "}
                          {modelName(c.model_b_id)}
                          {c.deep_debate ? (
                            <span className="ml-1.5 text-[9px] font-semibold text-emerald-600">DEEP</span>
                          ) : null}
                        </td>
                        <td className="py-1.5 pr-3 text-gray-500">{modelName(c.judge_model_id)}</td>
                        <td className="py-1.5 pr-3 text-gray-700">{winnerName}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-gray-500">
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

        <p className="mt-4 text-[10px] text-gray-400">
          Dimensions only — no topics or transcripts are stored. Per-key spend exists for matches recorded
          after migration 0010; older matches count as $0 in the key panels.
        </p>
      </div>
    </main>
  );
}
