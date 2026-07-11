/**
 * The analytics "card": the dimensions-only projection of a finished match. This
 * is the privacy boundary — it MUST NOT carry any debate content (topic text,
 * transcript, or custom-tone wording); only the tone preset name is kept. A test
 * (matchCard.test.ts) enforces that content never leaks in.
 */
import type { DebateSession } from "@/lib/debate/debateTypes";

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
}

export function buildMatchCard(
  session: DebateSession,
  opts: { judgeModelId: string; verdictCost: number; userId: string | null },
): MatchCard {
  const v = session.verdict;
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
    winner: v?.winner ?? null,
    score_a: typeof v?.scoreModelA === "number" ? v.scoreModelA : null,
    score_b: typeof v?.scoreModelB === "number" ? v.scoreModelB : null,
    match_cost: session.costSummary.totalCost,
    verdict_cost: opts.verdictCost,
  };
}
