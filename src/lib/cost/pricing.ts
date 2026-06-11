/**
 * Configurable pricing table (docs/08_COST_TRACKING.md).
 *
 * Keyed by `providerId:modelId`. Values are USD per 1,000,000 tokens.
 *
 * IMPORTANT: pricing lives here, never inside UI components. The values are
 * real provider rates verified against the official pricing pages (see the
 * verification note on the table below); re-check them when providers change
 * pricing or new models are added.
 */

export interface ModelPrice {
  inputCostPer1M: number;
  /**
   * Cache-HIT input rate (USD per 1M). Providers bill input tokens served from
   * the prompt cache at a steep discount; defaults to inputCostPer1M when unset
   * (no phantom discount for models with no published cached rate).
   */
  cachedInputCostPer1M?: number;
  outputCostPer1M: number;
}

// USD per 1M tokens for the cost HUD. Standard, CACHED and output rates verified
// against the providers' official pricing pages in June 2026
// (openai.com/api/pricing, api-docs.deepseek.com). The cost engine bills the
// cache-hit portion of input at cachedInputCostPer1M, so the HUD reflects the
// real bill rather than an over-estimate. (OpenAI GPT-5 family ≈90% off cached,
// GPT-4.1 ≈75% off, GPT-4o ≈50% off.)
export const modelPricing: Record<string, ModelPrice> = {
  // OpenAI — verified June 2026.
  "openai:gpt-5.5": { inputCostPer1M: 5.0, cachedInputCostPer1M: 0.5, outputCostPer1M: 30.0 },
  "openai:gpt-5.4": { inputCostPer1M: 2.5, cachedInputCostPer1M: 0.25, outputCostPer1M: 15.0 },
  "openai:gpt-5.4-mini": { inputCostPer1M: 0.75, cachedInputCostPer1M: 0.075, outputCostPer1M: 4.5 },
  "openai:gpt-5.4-nano": { inputCostPer1M: 0.2, cachedInputCostPer1M: 0.02, outputCostPer1M: 1.25 },
  // gpt-5.3-chat-latest: no separate published rate; priced at its nearest
  // confirmed neighbor (gpt-5.2 / gpt-5.3-codex tier). ESTIMATE — and we do NOT
  // assume a cached discount for it (cached = standard) since the base is itself
  // an estimate.
  "openai:gpt-5.3-chat-latest": { inputCostPer1M: 1.75, outputCostPer1M: 14.0 },
  "openai:gpt-5.2-chat-latest": { inputCostPer1M: 1.75, cachedInputCostPer1M: 0.175, outputCostPer1M: 14.0 },
  "openai:gpt-5.1-chat-latest": { inputCostPer1M: 1.25, cachedInputCostPer1M: 0.125, outputCostPer1M: 10.0 },
  "openai:gpt-5-mini": { inputCostPer1M: 0.25, cachedInputCostPer1M: 0.025, outputCostPer1M: 2.0 },
  "openai:gpt-5-nano": { inputCostPer1M: 0.05, cachedInputCostPer1M: 0.005, outputCostPer1M: 0.4 },
  "openai:gpt-4.1": { inputCostPer1M: 2.0, cachedInputCostPer1M: 0.5, outputCostPer1M: 8.0 },
  "openai:gpt-4.1-mini": { inputCostPer1M: 0.4, cachedInputCostPer1M: 0.1, outputCostPer1M: 1.6 },
  "openai:gpt-4.1-nano": { inputCostPer1M: 0.1, cachedInputCostPer1M: 0.025, outputCostPer1M: 0.4 },
  "openai:gpt-4o": { inputCostPer1M: 2.5, cachedInputCostPer1M: 1.25, outputCostPer1M: 10.0 },
  "openai:gpt-4o-mini": { inputCostPer1M: 0.15, cachedInputCostPer1M: 0.075, outputCostPer1M: 0.6 },
  // DeepSeek — verified June 2026 (cache-miss / cache-hit input; output).
  "deepseek:deepseek-v4-pro": { inputCostPer1M: 0.435, cachedInputCostPer1M: 0.003625, outputCostPer1M: 0.87 },
  "deepseek:deepseek-v4-flash": { inputCostPer1M: 0.14, cachedInputCostPer1M: 0.0028, outputCostPer1M: 0.28 },
  // OpenRouter — these are FREE models, so $0.00 (the HUD shows $0).
  "openrouter:qwen/qwen3-next-80b-a3b-instruct:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:meta-llama/llama-3.3-70b-instruct:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:moonshotai/kimi-k2.6:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:z-ai/glm-4.5-air:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:google/gemma-4-31b-it:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:openai/gpt-oss-120b:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
};

/**
 * Server TTS (fighter voices): USD per 1M input CHARACTERS — OpenAI speech
 * (gpt-4o-mini-tts ≈ $0.015/min, June 2026), billed here as its character
 * equivalent. An optional TTS_COST_USD_PER_1M override is resolved
 * server-side in src/lib/tts/server.
 */
export const TTS_COST_USD_PER_1M_CHARS = 15.0;

/** Fallback price used when a model is not found in the table. */
export const FALLBACK_PRICE: ModelPrice = {
  inputCostPer1M: 0.5,
  outputCostPer1M: 1.5,
};

export function priceKey(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`;
}

const ZERO_PRICE: ModelPrice = { inputCostPer1M: 0, outputCostPer1M: 0 };

export function getModelPrice(providerId: string, modelId: string): ModelPrice {
  const exact = modelPricing[priceKey(providerId, modelId)];
  if (exact) return exact;
  // Any OpenRouter ":free" model costs $0 — no need to list each one.
  if (providerId === "openrouter" && modelId.endsWith(":free")) return ZERO_PRICE;
  return FALLBACK_PRICE;
}
