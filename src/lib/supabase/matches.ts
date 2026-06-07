/**
 * Match persistence shapes (docs/19). Pure — no client/server Supabase import —
 * so both the browser saver and the server profile page can use it safely.
 */

import type { DebateSession } from "@/lib/debate/debateTypes";

/** Columns selected for history listing + stats (NOT the heavy `session` blob). */
export const MATCH_SUMMARY_COLUMNS =
  "id, app_session_id, topic, mode, round_count, model_a, model_b, winner, total_cost, deep_debate, created_at";

export interface MatchSummary {
  id: string;
  app_session_id: string;
  topic: string;
  mode: string;
  round_count: number;
  model_a: string;
  model_b: string;
  winner: string | null;
  total_cost: number;
  deep_debate: boolean;
  created_at: string;
}

/** Map a finished session to a `matches` row for upsert (keyed by user + session id). */
export function toMatchRow(session: DebateSession, userId: string) {
  return {
    user_id: userId,
    app_session_id: session.id,
    topic: session.topic,
    mode: session.mode,
    round_count: session.roundCount,
    model_a: session.modelA.displayName,
    model_b: session.modelB.displayName,
    winner: session.verdict?.winner ?? null,
    total_cost: session.costSummary.totalCost,
    deep_debate: session.deepDebate,
    session,
  };
}

export interface ProfileStats {
  total: number;
  totalCost: number;
  debates: number;
  discussions: number;
  deep: number;
  /** fighter display name → number of wins (ties/no-verdict excluded). */
  winsByModel: Record<string, number>;
  topFighter: string | null;
}

/** Aggregate headline stats from the summary rows (cheap; no blob needed). */
export function computeStats(rows: MatchSummary[]): ProfileStats {
  const stats: ProfileStats = {
    total: rows.length,
    totalCost: 0,
    debates: 0,
    discussions: 0,
    deep: 0,
    winsByModel: {},
    topFighter: null,
  };
  const appearances: Record<string, number> = {};
  for (const r of rows) {
    stats.totalCost += Number(r.total_cost) || 0;
    if (r.mode === "debate") stats.debates += 1;
    else stats.discussions += 1;
    if (r.deep_debate) stats.deep += 1;
    appearances[r.model_a] = (appearances[r.model_a] ?? 0) + 1;
    appearances[r.model_b] = (appearances[r.model_b] ?? 0) + 1;
    const winner = r.winner === "modelA" ? r.model_a : r.winner === "modelB" ? r.model_b : null;
    if (winner) stats.winsByModel[winner] = (stats.winsByModel[winner] ?? 0) + 1;
  }
  stats.topFighter =
    Object.entries(appearances).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return stats;
}
