/**
 * Pure aggregation over analytics cards → the admin dashboard payload. Kept pure
 * (no DB, no env) so it's fully unit-tested AND client-safe: the interactive
 * /admin dashboard fetches raw cards once and re-aggregates in the browser as
 * the owner filters (time range, dimension picks). Move hot aggregates to SQL
 * if volume ever demands it.
 */
import type { MatchCard } from "@/lib/analytics/matchCard";

export type StoredMatchCard = MatchCard & { created_at: string };

export interface Tally {
  key: string;
  count: number;
}

/** Cost attributed to each billed API key (see MatchCard cost_* columns). */
export interface ProviderCosts {
  openai: number;
  deepseek: number;
  openrouter: number;
  search: number;
}

export const EMPTY_PROVIDER_COSTS: ProviderCosts = {
  openai: 0,
  deepseek: 0,
  openrouter: 0,
  search: 0,
};

export interface DayPoint {
  day: string;
  count: number;
  cost: number;
  providers: ProviderCosts;
}

export interface DashboardData {
  overview: {
    matches: number;
    uniqueUsers: number;
    totalMatchCost: number;
    totalVerdictCost: number;
    avgRounds: number;
  };
  /** Totals per API key across the aggregated cards. */
  providerCosts: ProviderCosts;
  perDay: DayPoint[];
  topFighters: Tally[];
  topJudges: Tally[];
  judgeModes: Tally[];
  winners: Tally[];
  /** Wins per actual MODEL (winner side resolved to the model id; ties skipped). */
  winningModels: Tally[];
  modes: Tally[];
  tones: Tally[];
  lengths: Tally[];
  languages: Tally[];
  deepShare: number;
}

/** Count occurrences of a derived key, returned as a count-desc Tally[]. */
function tally(cards: StoredMatchCard[], keyOf: (c: StoredMatchCard) => string): Tally[] {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const k = keyOf(c);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function providerCostsOf(c: StoredMatchCard): ProviderCosts {
  return {
    openai: Number(c.cost_openai) || 0,
    deepseek: Number(c.cost_deepseek) || 0,
    openrouter: Number(c.cost_openrouter) || 0,
    search: Number(c.cost_search) || 0,
  };
}

function addCosts(into: ProviderCosts, add: ProviderCosts): void {
  into.openai += add.openai;
  into.deepseek += add.deepseek;
  into.openrouter += add.openrouter;
  into.search += add.search;
}

export function buildDashboard(cards: StoredMatchCard[]): DashboardData {
  const matches = cards.length;
  const users = new Set<string>();
  let totalMatchCost = 0;
  let totalVerdictCost = 0;
  let totalRounds = 0;
  let deep = 0;
  const providerCosts: ProviderCosts = { ...EMPTY_PROVIDER_COSTS };
  const byDay = new Map<string, { count: number; cost: number; providers: ProviderCosts }>();

  for (const c of cards) {
    if (c.user_id) users.add(c.user_id);
    totalMatchCost += Number(c.match_cost) || 0;
    totalVerdictCost += Number(c.verdict_cost) || 0;
    totalRounds += Number(c.round_count) || 0;
    if (c.deep_debate) deep += 1;
    const perProvider = providerCostsOf(c);
    addCosts(providerCosts, perProvider);
    const day = c.created_at.slice(0, 10); // UTC ISO date
    const d = byDay.get(day) ?? { count: 0, cost: 0, providers: { ...EMPTY_PROVIDER_COSTS } };
    d.count += 1;
    d.cost += Number(c.match_cost) || 0;
    addCosts(d.providers, perProvider);
    byDay.set(day, d);
  }

  const perDay: DayPoint[] = [...byDay.entries()]
    .map(([day, v]) => ({ day, count: v.count, cost: v.cost, providers: v.providers }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Fighters appear in either slot — count both.
  const fighterCounts = new Map<string, number>();
  for (const c of cards) {
    fighterCounts.set(c.model_a_id, (fighterCounts.get(c.model_a_id) ?? 0) + 1);
    fighterCounts.set(c.model_b_id, (fighterCounts.get(c.model_b_id) ?? 0) + 1);
  }
  const topFighters: Tally[] = [...fighterCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  // Wins resolved to the actual model (ties / no-verdict skipped).
  const winCounts = new Map<string, number>();
  for (const c of cards) {
    const id = c.winner === "modelA" ? c.model_a_id : c.winner === "modelB" ? c.model_b_id : null;
    if (id) winCounts.set(id, (winCounts.get(id) ?? 0) + 1);
  }
  const winningModels: Tally[] = [...winCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  return {
    overview: {
      matches,
      uniqueUsers: users.size,
      totalMatchCost,
      totalVerdictCost,
      avgRounds: matches ? totalRounds / matches : 0,
    },
    providerCosts,
    perDay,
    topFighters,
    topJudges: tally(cards, (c) => c.judge_model_id),
    judgeModes: tally(cards, (c) => c.judge_mode),
    winners: tally(cards, (c) => c.winner ?? "none"),
    winningModels,
    modes: tally(cards, (c) => c.mode),
    tones: tally(cards, (c) => c.tone),
    lengths: tally(cards, (c) => c.response_length),
    languages: tally(cards, (c) => c.language || "en"),
    deepShare: matches ? deep / matches : 0,
  };
}
