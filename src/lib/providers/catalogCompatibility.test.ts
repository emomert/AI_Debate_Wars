import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { openaiProvider } from "./openaiProvider";
import { openRouterProvider } from "./openRouterProvider";
import { getModelById, getProviderModelConfig, MODEL_CATALOG } from "@/lib/models/modelRegistry";
import { modelPricing } from "@/lib/cost/pricing";
import { calculateCost } from "@/lib/cost/calculateCost";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function mockCompletion() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    choices: [{ message: { content: "Libraries make knowledge accessible." }, finish_reason: "stop" }],
    usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110,
      prompt_tokens_details: { cached_tokens: 20, cache_write_tokens: 30 } },
  }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("current catalog API compatibility", () => {
  it("Astra sends the supported token/effort parameters and retains cache-write usage", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = mockCompletion();
    const result = await openaiProvider.generate({ model: getProviderModelConfig("gpt-6-astra"),
      systemPrompt: "Debate.", userPrompt: "Argue for libraries.", temperature: 0.8,
      maxOutputTokens: 380, kind: "turn" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: "gpt-6-astra", max_completion_tokens: 2380, reasoning_effort: "low" });
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("max_tokens");
    expect(result.usage?.cacheWriteInputTokens).toBe(30);
    expect(calculateCost("openai", "gpt-6-astra", result.usage!).totalCost).toBeCloseTo(0.001395, 9);
  });

  it.each(["gpt-5.6-sol", "gpt-4.1-mini"])("preserves existing OpenAI behavior for %s", async (id) => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = mockCompletion();
    await openaiProvider.generate({ model: getProviderModelConfig(id), systemPrompt: "Debate.",
      userPrompt: "Libraries.", temperature: 0.8, maxOutputTokens: 380, kind: "turn" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("reasoning_effort");
    if (id.startsWith("gpt-5")) {
      expect(body.max_completion_tokens).toBe(2380);
      expect(body).not.toHaveProperty("temperature");
    } else {
      expect(body.max_tokens).toBe(380);
      expect(body.temperature).toBe(0.8);
    }
  });

  it("Fable 5.1 omits unsupported temperature without enabling optional reasoning", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchMock = mockCompletion();
    await openRouterProvider.generate({ model: getProviderModelConfig("anthropic/claude-fable-5.1"),
      systemPrompt: "Debate.", userPrompt: "Libraries.", temperature: 0.8, maxOutputTokens: 380, kind: "turn" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("reasoning");
    expect(body.max_tokens).toBe(2880);
  });

  it("every catalog id is unique and has explicit API pricing", () => {
    expect(new Set(MODEL_CATALOG.map(m => m.id)).size).toBe(MODEL_CATALOG.length);
    for (const m of MODEL_CATALOG) {
      expect(Object.hasOwn(modelPricing, `${m.providerId}:${m.id}`), m.id).toBe(true);
      expect(modelPricing[`${m.providerId}:${m.id}`].outputCostPer1M, m.id).toBeGreaterThan(0);
    }
    expect(getModelById("deepseek-v4-flash-vision-exp")?.providerId).toBe("deepseek");
  });
});
