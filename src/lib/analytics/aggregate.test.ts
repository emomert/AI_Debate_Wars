import { describe, expect, it } from "vitest";

import { buildDashboard, type StoredMatchCard } from "./aggregate";

function card(over: Partial<StoredMatchCard> = {}): StoredMatchCard {
  return {
    app_session_id: Math.random().toString(36).slice(2),
    user_id: "u1",
    mode: "debate",
    round_count: 3,
    battle_count: 1,
    deep_debate: false,
    tone: "serious",
    response_length: "short",
    pace: "auto",
    language: "en",
    model_a_id: "anthropic/claude-sonnet-5",
    model_b_id: "x-ai/grok-4.5",
    judge_mode: "auto",
    judge_model_id: "gpt-4.1-mini",
    winner: "modelA",
    score_a: 60,
    score_b: 40,
    match_cost: 0.01,
    verdict_cost: 0.002,
    created_at: "2026-07-10T12:00:00Z",
    ...over,
  };
}

describe("buildDashboard", () => {
  it("computes overview totals and unique users", () => {
    const d = buildDashboard([
      card({ user_id: "u1", match_cost: 0.01, verdict_cost: 0.002 }),
      card({ user_id: "u1", match_cost: 0.02, verdict_cost: 0.003 }),
      card({ user_id: "u2", match_cost: 0.03, verdict_cost: 0.004 }),
    ]);
    expect(d.overview.matches).toBe(3);
    expect(d.overview.uniqueUsers).toBe(2);
    expect(d.overview.totalMatchCost).toBeCloseTo(0.06, 6);
    expect(d.overview.totalVerdictCost).toBeCloseTo(0.009, 6);
  });

  it("counts fighter appearances across both slots", () => {
    const d = buildDashboard([
      card({ model_a_id: "A", model_b_id: "B" }),
      card({ model_a_id: "A", model_b_id: "C" }),
      card({ model_a_id: "C", model_b_id: "B" }),
    ]);
    const map = Object.fromEntries(d.topFighters.map((f) => [f.key, f.count]));
    expect(map.A).toBe(2);
    expect(map.B).toBe(2);
    expect(map.C).toBe(2);
  });

  it("breaks down judge mode (answers 'do users change the judge?')", () => {
    const d = buildDashboard([
      card({ judge_mode: "auto" }),
      card({ judge_mode: "auto" }),
      card({ judge_mode: "thirdModel" }),
    ]);
    const map = Object.fromEntries(d.judgeModes.map((j) => [j.key, j.count]));
    expect(map.auto).toBe(2);
    expect(map.thirdModel).toBe(1);
  });

  it("counts judge models actually used", () => {
    const d = buildDashboard([
      card({ judge_model_id: "gpt-4.1-mini" }),
      card({ judge_model_id: "gpt-4.1-mini" }),
      card({ judge_model_id: "google/gemini-3.1-flash-lite" }),
    ]);
    expect(d.topJudges[0]).toEqual({ key: "gpt-4.1-mini", count: 2 });
  });

  it("buckets matches by UTC day, oldest first", () => {
    const d = buildDashboard([
      card({ created_at: "2026-07-10T23:00:00Z", match_cost: 0.01 }),
      card({ created_at: "2026-07-11T01:00:00Z", match_cost: 0.02 }),
      card({ created_at: "2026-07-11T05:00:00Z", match_cost: 0.03 }),
    ]);
    expect(d.perDay).toEqual([
      { day: "2026-07-10", count: 1, cost: 0.01 },
      { day: "2026-07-11", count: 2, cost: 0.05 },
    ]);
  });

  it("reports deep-debate share", () => {
    const d = buildDashboard([card({ deep_debate: true }), card({ deep_debate: false })]);
    expect(d.deepShare).toBeCloseTo(0.5, 6);
  });
});
