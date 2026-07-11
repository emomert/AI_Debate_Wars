/**
 * Pure aggregation over analytics cards → the admin dashboard payload. Kept pure
 * (no DB, no env) so it's fully unit-tested; the admin route fetches the rows and
 * calls buildDashboard on them. At launch volume, aggregating in JS over the
 * flat (blob-free) rows is cheap; move hot aggregates to SQL if volume demands.
 */
import type { MatchCard } from "@/lib/analytics/matchCard";

export type StoredMatchCard = MatchCard & { created_at: string };

export interface Tally {
  key: string;
  count: number;
}

export interface DayPoint {
  day: string;
  count: number;
  cost: number;
}

export interface DashboardData {
  overview: {
    matches: number;
    uniqueUsers: number;
    totalMatchCost: number;
    totalVerdictCost: number;
    avgRounds: number;
  };
  perDay: DayPoint[];
  topFighters: Tally[];
  topJudges: Tally[];
  judgeModes: Tally[];
  winners: Tally[];
  modes: Tally[];
  tones: Tally[];
  lengths: Tally[];
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

export function buildDashboard(cards: StoredMatchCard[]): DashboardData {
  const matches = cards.length;
  const users = new Set<string>();
  let totalMatchCost = 0;
  let totalVerdictCost = 0;
  let totalRounds = 0;
  let deep = 0;
  const byDay = new Map<string, { count: number; cost: number }>();

  for (const c of cards) {
    if (c.user_id) users.add(c.user_id);
    totalMatchCost += Number(c.match_cost) || 0;
    totalVerdictCost += Number(c.verdict_cost) || 0;
    totalRounds += Number(c.round_count) || 0;
    if (c.deep_debate) deep += 1;
    const day = c.created_at.slice(0, 10); // UTC ISO date
    const d = byDay.get(day) ?? { count: 0, cost: 0 };
    d.count += 1;
    d.cost += Number(c.match_cost) || 0;
    byDay.set(day, d);
  }

  const perDay: DayPoint[] = [...byDay.entries()]
    .map(([day, v]) => ({ day, count: v.count, cost: v.cost }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Fighters appear in either slot — count both.
  const fighters = tally(
    cards.flatMap((c) => [
      { ...c, __k: c.model_a_id },
      { ...c, __k: c.model_b_id },
    ]) as unknown as StoredMatchCard[],
    (c) => (c as unknown as { __k: string }).__k,
  );

  return {
    overview: {
      matches,
      uniqueUsers: users.size,
      totalMatchCost,
      totalVerdictCost,
      avgRounds: matches ? totalRounds / matches : 0,
    },
    perDay,
    topFighters: fighters,
    topJudges: tally(cards, (c) => c.judge_model_id),
    judgeModes: tally(cards, (c) => c.judge_mode),
    winners: tally(cards, (c) => c.winner ?? "none"),
    modes: tally(cards, (c) => c.mode),
    tones: tally(cards, (c) => c.tone),
    lengths: tally(cards, (c) => c.response_length),
    deepShare: matches ? deep / matches : 0,
  };
}
