import { describe, expect, it } from "vitest";

import { buildMatchCard } from "./matchCard";
import type { DebateSession } from "@/lib/debate/debateTypes";

function baseSession(over: Partial<DebateSession> = {}): DebateSession {
  return {
    id: "sess-1",
    topic: "SECRET TOPIC TEXT that must never be stored",
    mode: "debate",
    tone: "custom",
    customTone: "SECRET custom tone wording",
    deepDebate: true,
    responseLength: "short",
    roundCount: 3,
    pace: "auto",
    language: "en",
    battleCount: 2,
    judge: { enabled: true, mode: "thirdModel", model: { providerId: "openai", modelId: "gpt-4.1-mini" } },
    modelA: { providerId: "openrouter", modelId: "anthropic/claude-sonnet-5", displayName: "Sonnet 5", color: "blue" },
    modelB: { providerId: "openrouter", modelId: "x-ai/grok-4.5", displayName: "Grok 4.5", color: "red" },
    turns: [],
    messages: [{ content: "SECRET transcript text" }],
    verdict: { winner: "modelA", scoreModelA: 60, scoreModelB: 40 },
    costSummary: { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, totalCost: 0.0123, currency: "USD" },
    status: "complete",
    createdAt: "2026-07-11T00:00:00Z",
    updatedAt: "2026-07-11T00:00:00Z",
    ...over,
  } as unknown as DebateSession;
}

describe("buildMatchCard", () => {
  it("captures the dimensions from the session", () => {
    const card = buildMatchCard(baseSession(), {
      judgeModelId: "gpt-4.1-mini",
      verdictCost: 0.002,
      userId: "user-9",
      winner: "modelA",
      scoreA: 60,
      scoreB: 40,
    });
    expect(card).toMatchObject({
      app_session_id: "sess-1",
      user_id: "user-9",
      mode: "debate",
      round_count: 3,
      battle_count: 2,
      deep_debate: true,
      tone: "custom",
      response_length: "short",
      pace: "auto",
      language: "en",
      model_a_id: "anthropic/claude-sonnet-5",
      model_b_id: "x-ai/grok-4.5",
      judge_mode: "thirdModel",
      judge_model_id: "gpt-4.1-mini",
      winner: "modelA",
      score_a: 60,
      score_b: 40,
      match_cost: 0.0123,
      verdict_cost: 0.002,
    });
  });

  it("NEVER includes debate content (topic / transcript / custom-tone wording)", () => {
    const card = buildMatchCard(baseSession(), {
      judgeModelId: "gpt-4.1-mini",
      verdictCost: 0.002,
      userId: null,
      winner: "modelA",
      scoreA: 60,
      scoreB: 40,
    });
    const serialized = JSON.stringify(card);
    expect(serialized).not.toContain("SECRET TOPIC TEXT");
    expect(serialized).not.toContain("SECRET custom tone wording");
    expect(serialized).not.toContain("SECRET transcript text");
    // The card stores only the tone PRESET name, never the wording.
    expect(card.tone).toBe("custom");
    expect(Object.keys(card)).not.toContain("topic");
    expect(Object.keys(card)).not.toContain("customTone");
  });

  it("defaults battle_count/language and tolerates a missing verdict", () => {
    const card = buildMatchCard(
      baseSession({ battleCount: undefined, language: undefined, verdict: undefined }),
      { judgeModelId: "gpt-4o-mini", verdictCost: 0, userId: null, winner: null, scoreA: null, scoreB: null },
    );
    expect(card.battle_count).toBe(1);
    expect(card.language).toBe("en");
    expect(card.winner).toBeNull();
    expect(card.score_a).toBeNull();
    expect(card.score_b).toBeNull();
  });

  it("splits cost per billed API key (backend from the catalog, search split out)", () => {
    const card = buildMatchCard(
      baseSession({
        messages: [
          // OpenRouter fighter turn with a Brave search fee folded in.
          {
            speaker: "modelA",
            modelId: "x-ai/grok-4.5",
            providerId: "openrouter",
            status: "complete",
            content: "x",
            cost: { totalCost: 0.015, searchCost: 0.005, inputCost: 0, outputCost: 0, currency: "USD" },
          },
          // DeepSeek-direct fighter turn.
          {
            speaker: "modelB",
            modelId: "deepseek-v4-pro",
            providerId: "deepseek",
            status: "complete",
            content: "y",
            cost: { totalCost: 0.02, inputCost: 0, outputCost: 0, currency: "USD" },
          },
          // Incomplete turn: never billed, must not count.
          {
            speaker: "modelA",
            modelId: "x-ai/grok-4.5",
            providerId: "openrouter",
            status: "error",
            content: "z",
            cost: { totalCost: 99, inputCost: 0, outputCost: 0, currency: "USD" },
          },
        ],
        // A previous judge call (re-judge flow) already paid on DeepSeek.
        pastVerdicts: [
          { judgeModelId: "deepseek-v4-flash", cost: { totalCost: 0.003, inputCost: 0, outputCost: 0, currency: "USD" } },
        ],
        verdict: undefined,
      } as never),
      // This verdict billed the OpenAI key.
      { judgeModelId: "gpt-4.1-mini", verdictCost: 0.002, userId: null, winner: "modelA", scoreA: 60, scoreB: 40 },
    );
    expect(card.cost_openrouter).toBeCloseTo(0.01, 6); // 0.015 minus the search fee
    expect(card.cost_search).toBeCloseTo(0.005, 6);
    expect(card.cost_deepseek).toBeCloseTo(0.023, 6); // turn + past judge
    expect(card.cost_openai).toBeCloseTo(0.002, 6); // this verdict
  });

  it("records the outcome from opts even when the session carries no verdict (route call shape)", () => {
    const card = buildMatchCard(baseSession({ verdict: undefined }), {
      judgeModelId: "gpt-4.1-mini",
      verdictCost: 0.002,
      userId: "u1",
      winner: "modelB",
      scoreA: 45,
      scoreB: 55,
    });
    expect(card.winner).toBe("modelB");
    expect(card.score_a).toBe(45);
    expect(card.score_b).toBe(55);
  });
});
