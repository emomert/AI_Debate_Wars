/**
 * The analytics "card": the dimensions-only projection of a finished match. This
 * is the privacy boundary — it MUST NOT carry any debate content (topic text,
 * transcript, or custom-tone wording); only the tone preset name is kept. A test
 * (matchCard.test.ts) enforces that content never leaks in.
 */
import type { DebateSession } from "@/lib/debate/debateTypes";
import { getModelById, type Backend } from "@/lib/models/modelRegistry";

export interface MatchCard {
  app_session_id: string;
  user_id: string | null;
  mode: string;
  round_count: number;
  battle_count: number;
  deep_debate: boolean;
  tone: string;
  response_length: string;
  pace: string;
  language: string;
  model_a_id: string;
  model_b_id: string;
  judge_mode: string;
  judge_model_id: string;
  winner: string | null;
  score_a: number | null;
  score_b: number | null;
  match_cost: number;
  verdict_cost: number;
  /** Cost attributed to each billed API key (model inference per backend;
   *  search = Brave fees). Answers "which key is this match billing?". */
  cost_openai: number;
  cost_deepseek: number;
  cost_openrouter: number;
  cost_search: number;
}

/** Which API key a model id bills — catalog first, session hint as fallback. */
function backendOf(modelId: string, hint?: string): Backend {
  const fromCatalog = getModelById(modelId)?.providerId;
  if (fromCatalog) return fromCatalog;
  return hint === "openai" || hint === "deepseek" || hint === "openrouter"
    ? hint
    : "openrouter";
}

/**
 * Attribute the match's spend to the API keys that billed it. Turn costs come
 * from the session's per-message cost entries (analytics-grade — the session is
 * client-submitted; server-computed judge cost is passed separately). Brave
 * search fees are split out of each deep turn's cost into their own bucket.
 */
function splitCosts(
  session: DebateSession,
  judgeModelId: string,
  verdictCost: number,
): { openai: number; deepseek: number; openrouter: number; search: number } {
  const buckets = { openai: 0, deepseek: 0, openrouter: 0, search: 0 };
  for (const m of session.messages) {
    if (m.speaker === "judge" || m.status !== "complete" || !m.cost) continue;
    const total = Number(m.cost.totalCost) || 0;
    const search = Number(m.cost.searchCost) || 0;
    buckets.search += search;
    buckets[backendOf(m.modelId, m.providerId)] += Math.max(0, total - search);
  }
  // Judge/re-judge calls already paid for (client-reported), plus THIS verdict.
  for (const v of [...(session.pastVerdicts ?? []), session.verdict]) {
    if (!v?.cost) continue;
    buckets[backendOf(v.judgeModelId)] += Number(v.cost.totalCost) || 0;
  }
  buckets[backendOf(judgeModelId)] += verdictCost;
  return buckets;
}

export function buildMatchCard(
  session: DebateSession,
  opts: {
    judgeModelId: string;
    verdictCost: number;
    userId: string | null;
    winner: string | null;
    scoreA: number | null;
    scoreB: number | null;
  },
): MatchCard {
  const costs = splitCosts(session, opts.judgeModelId, opts.verdictCost);
  return {
    app_session_id: session.id,
    user_id: opts.userId,
    mode: session.mode,
    round_count: session.roundCount,
    battle_count: session.battleCount ?? 1,
    deep_debate: session.deepDebate,
    tone: session.tone, // preset name only — never customTone wording
    response_length: session.responseLength,
    pace: session.pace,
    language: session.language ?? "en",
    model_a_id: session.modelA.modelId,
    model_b_id: session.modelB.modelId,
    judge_mode: session.judge.mode,
    judge_model_id: opts.judgeModelId,
    winner: opts.winner,
    score_a: opts.scoreA,
    score_b: opts.scoreB,
    match_cost: session.costSummary.totalCost,
    verdict_cost: opts.verdictCost,
    cost_openai: costs.openai,
    cost_deepseek: costs.deepseek,
    cost_openrouter: costs.openrouter,
    cost_search: costs.search,
  };
}
