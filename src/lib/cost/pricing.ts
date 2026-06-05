/**
 * Configurable pricing table (docs/08_COST_TRACKING.md).
 *
 * Keyed by `providerId:modelId`. Values are USD per 1,000,000 tokens.
 *
 * IMPORTANT: pricing lives here, never inside UI components. Before real
 * launch (Phase 3+), fill these with current provider pricing. The mock-mode
 * numbers below are intentionally tiny, realistic-looking placeholders so the
 * Phase 1 cost HUD shows believable values.
 */

export interface ModelPrice {
  inputCostPer1M: number;
  outputCostPer1M: number;
}

// NOTE: these are ESTIMATES (USD per 1M tokens) for the cost HUD. Verify against
// the providers' current pricing pages before relying on them for billing.
export const modelPricing: Record<string, ModelPrice> = {
  // OpenAI
  "openai:gpt-5.2-chat-latest": { inputCostPer1M: 1.25, outputCostPer1M: 10.0 },
  "openai:gpt-5.1-chat-latest": { inputCostPer1M: 1.25, outputCostPer1M: 10.0 },
  "openai:gpt-5-mini": { inputCostPer1M: 0.25, outputCostPer1M: 2.0 },
  "openai:gpt-5-nano": { inputCostPer1M: 0.05, outputCostPer1M: 0.4 },
  "openai:gpt-4.1": { inputCostPer1M: 2.0, outputCostPer1M: 8.0 },
  "openai:gpt-4.1-mini": { inputCostPer1M: 0.4, outputCostPer1M: 1.6 },
  "openai:gpt-4.1-nano": { inputCostPer1M: 0.1, outputCostPer1M: 0.4 },
  "openai:gpt-4o": { inputCostPer1M: 2.5, outputCostPer1M: 10.0 },
  "openai:gpt-4o-mini": { inputCostPer1M: 0.15, outputCostPer1M: 0.6 },
  // DeepSeek
  "deepseek:deepseek-v4-pro": { inputCostPer1M: 0.55, outputCostPer1M: 2.19 },
  "deepseek:deepseek-v4-flash": { inputCostPer1M: 0.27, outputCostPer1M: 1.1 },
  // OpenRouter — these are FREE models, so $0.00 (the HUD shows $0).
  "openrouter:qwen/qwen3-next-80b-a3b-instruct:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:meta-llama/llama-3.3-70b-instruct:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:moonshotai/kimi-k2.6:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:z-ai/glm-4.5-air:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:google/gemma-4-31b-it:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
  "openrouter:openai/gpt-oss-120b:free": { inputCostPer1M: 0, outputCostPer1M: 0 },
};

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
