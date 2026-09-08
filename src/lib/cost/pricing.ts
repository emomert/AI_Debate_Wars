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
  /** Input tokens written to cache can cost more than uncached input. */
  cacheWriteInputCostPer1M?: number;
  outputCostPer1M: number;
}

// USD per 1M tokens. September 8, 2026: Astra and DeepSeek from official docs;
// all selectable OpenRouter input/output rates refreshed from /api/v1/models.
// Older OpenAI rates retain their July verification. DeepSeek uses peak rates
// conservatively. OpenRouter cached discounts are omitted because routes vary.
// This is estimated accounting, not an exact provider invoice (docs/26 audit).
export const modelPricing: Record<string, ModelPrice> = {
  // 2026-09-08: official OpenAI/DeepSeek docs + live OpenRouter catalog.
  // DeepSeek uses PEAK prices conservatively; off-peak charges are lower.
  "openai:gpt-6-astra": { inputCostPer1M: 10, cachedInputCostPer1M: 1, cacheWriteInputCostPer1M: 12.5, outputCostPer1M: 50 },
  "deepseek:deepseek-v4-flash-vision-exp": { inputCostPer1M: 0.44, cachedInputCostPer1M: 0.014, outputCostPer1M: 1.32 },
  "openrouter:anthropic/claude-fable-5.1": { inputCostPer1M: 10, outputCostPer1M: 50 },
  "openrouter:qwen/qwen3.8-max-0902": { inputCostPer1M: 2, outputCostPer1M: 6 },
  "openrouter:qwen/qwen3.8-27b": { inputCostPer1M: 0.42, outputCostPer1M: 3 },
  "openrouter:qwen/qwen3.8-2.4t-a95b": { inputCostPer1M: 2, outputCostPer1M: 6 },
  "openrouter:google/gemini-3.8-flash": { inputCostPer1M: 0.75, outputCostPer1M: 3.75 },
  "openrouter:google/gemini-3.7-flash": { inputCostPer1M: 0.75, outputCostPer1M: 3.75 },
  "openrouter:x-ai/grok-4.6": { inputCostPer1M: 2, outputCostPer1M: 6 },
  "openrouter:z-ai/glm-5.3": { inputCostPer1M: 1.4, outputCostPer1M: 4.4 },
  "openrouter:z-ai/glm-5.3-flash": { inputCostPer1M: 0.075, outputCostPer1M: 0.25 },
  "openrouter:tencent/hy4-preview": { inputCostPer1M: 0.834, outputCostPer1M: 2.501 },
  "openrouter:meta/muse-glimmer-30b": { inputCostPer1M: 0.3, outputCostPer1M: 1.1 },
  // OpenAI — verified July 2026. (Only gpt-5.1-chat-latest was dropped — it
  // shuts down 2026-07-23. Models with later sunsets stay listed until their
  // date; see the registry's deprecation note.)
  "openai:gpt-5.6-sol": { inputCostPer1M: 5.0, cachedInputCostPer1M: 0.5, outputCostPer1M: 30.0 },
  "openai:gpt-5.6-terra": { inputCostPer1M: 2.5, cachedInputCostPer1M: 0.25, outputCostPer1M: 15.0 },
  "openai:gpt-5.6-luna": { inputCostPer1M: 1.0, cachedInputCostPer1M: 0.1, outputCostPer1M: 6.0 },
  "openai:gpt-5.5": { inputCostPer1M: 5.0, cachedInputCostPer1M: 0.5, outputCostPer1M: 30.0 },
  "openai:gpt-5.4": { inputCostPer1M: 2.5, cachedInputCostPer1M: 0.25, outputCostPer1M: 15.0 },
  "openai:gpt-5.4-mini": { inputCostPer1M: 0.75, cachedInputCostPer1M: 0.075, outputCostPer1M: 4.5 },
  "openai:gpt-5.4-nano": { inputCostPer1M: 0.2, cachedInputCostPer1M: 0.02, outputCostPer1M: 1.25 },
  // (gpt-5.2/5.3-chat-latest removed 2026-07-12 — Aug 10 sunset.)
  "openai:gpt-5-mini": { inputCostPer1M: 0.25, cachedInputCostPer1M: 0.025, outputCostPer1M: 2.0 },
  "openai:gpt-5-nano": { inputCostPer1M: 0.05, cachedInputCostPer1M: 0.005, outputCostPer1M: 0.4 },
  "openai:gpt-4.1": { inputCostPer1M: 2.0, cachedInputCostPer1M: 0.5, outputCostPer1M: 8.0 },
  "openai:gpt-4.1-mini": { inputCostPer1M: 0.4, cachedInputCostPer1M: 0.1, outputCostPer1M: 1.6 },
  "openai:gpt-4.1-nano": { inputCostPer1M: 0.1, cachedInputCostPer1M: 0.025, outputCostPer1M: 0.4 },
  "openai:gpt-4o": { inputCostPer1M: 2.5, cachedInputCostPer1M: 1.25, outputCostPer1M: 10.0 },
  "openai:gpt-4o-mini": { inputCostPer1M: 0.15, cachedInputCostPer1M: 0.075, outputCostPer1M: 0.6 },
  // DeepSeek — September 8 peak rates (cache-miss / cache-hit input; output).
  "deepseek:deepseek-v4-pro": { inputCostPer1M: 1.32, cachedInputCostPer1M: 0.044, outputCostPer1M: 3.96 },
  "deepseek:deepseek-v4-flash": { inputCostPer1M: 0.44, cachedInputCostPer1M: 0.014, outputCostPer1M: 1.32 },
  // OpenRouter — paid catalog, rates from /api/v1/models (2026-07-11).
  // xAI
  "openrouter:x-ai/grok-4.5": { inputCostPer1M: 2, outputCostPer1M: 6 },
  "openrouter:x-ai/grok-4.3": { inputCostPer1M: 1.25, outputCostPer1M: 2.5 },
  "openrouter:x-ai/grok-4.20": { inputCostPer1M: 1.25, outputCostPer1M: 2.5 },
  // Anthropic
  "openrouter:anthropic/claude-fable-5": { inputCostPer1M: 10, outputCostPer1M: 50 },
  "openrouter:anthropic/claude-opus-5": { inputCostPer1M: 5, outputCostPer1M: 25 },
  "openrouter:anthropic/claude-opus-4.8": { inputCostPer1M: 5, outputCostPer1M: 25 },
  "openrouter:anthropic/claude-opus-4.7": { inputCostPer1M: 5, outputCostPer1M: 25 },
  "openrouter:anthropic/claude-opus-4.6": { inputCostPer1M: 5, outputCostPer1M: 25 },
  "openrouter:anthropic/claude-opus-4.5": { inputCostPer1M: 5, outputCostPer1M: 25 },
  "openrouter:anthropic/claude-sonnet-5": { inputCostPer1M: 2, outputCostPer1M: 10 },
  "openrouter:anthropic/claude-sonnet-4.6": { inputCostPer1M: 3, outputCostPer1M: 15 },
  // Google
  "openrouter:google/gemini-3.6-flash": { inputCostPer1M: 0.75, outputCostPer1M: 3.75 },
  "openrouter:google/gemini-3.5-flash": { inputCostPer1M: 1.5, outputCostPer1M: 9 },
  "openrouter:google/gemini-3.5-flash-lite": { inputCostPer1M: 0.3, outputCostPer1M: 2.5 },
  "openrouter:google/gemini-3.1-flash-lite": { inputCostPer1M: 0.25, outputCostPer1M: 1.5 },
  "openrouter:google/gemini-2.5-pro": { inputCostPer1M: 1.25, outputCostPer1M: 10 },
  "openrouter:google/gemini-2.5-flash": { inputCostPer1M: 0.3, outputCostPer1M: 2.5 },
  // Xiaomi
  "openrouter:xiaomi/mimo-v2.5-pro": { inputCostPer1M: 0.435, outputCostPer1M: 0.87 },
  "openrouter:xiaomi/mimo-v2.5": { inputCostPer1M: 0.14, outputCostPer1M: 0.28 },
  // Z.AI
  "openrouter:z-ai/glm-5.2": { inputCostPer1M: 0.966, outputCostPer1M: 3.036 },
  "openrouter:z-ai/glm-5": { inputCostPer1M: 0.6, outputCostPer1M: 1.92 },
  // Moonshot
  "openrouter:moonshotai/kimi-k3": { inputCostPer1M: 3, outputCostPer1M: 15 },
  "openrouter:moonshotai/kimi-k2.6": { inputCostPer1M: 0.95, outputCostPer1M: 4 },
  "openrouter:moonshotai/kimi-k2.7-code": { inputCostPer1M: 0.71, outputCostPer1M: 3.5 },
  // NVIDIA
  "openrouter:nvidia/nemotron-3-ultra-550b-a55b": { inputCostPer1M: 0.625, outputCostPer1M: 3.125 },
  "openrouter:nvidia/nemotron-3-super-120b-a12b": { inputCostPer1M: 0.085, outputCostPer1M: 0.4 },
  // Qwen
  "openrouter:qwen/qwen3.7-max": { inputCostPer1M: 1.475, outputCostPer1M: 4.425 },
  "openrouter:qwen/qwen3.7-plus": { inputCostPer1M: 0.32, outputCostPer1M: 1.28 },
  "openrouter:qwen/qwen3.7-flash": { inputCostPer1M: 0.03, outputCostPer1M: 0.13 },
  // MiniMax
  "openrouter:minimax/minimax-m3": { inputCostPer1M: 0.3, outputCostPer1M: 1.2 },
  "openrouter:minimax/minimax-m2.7": { inputCostPer1M: 0.3, outputCostPer1M: 1.2 },
  "openrouter:minimax/minimax-m2.5": { inputCostPer1M: 0.27, outputCostPer1M: 1.08 },
  // July 2026 expansion — rates from OpenRouter /api/v1/models (2026-07-12).
  "openrouter:meta-llama/llama-4-maverick": { inputCostPer1M: 0.2, outputCostPer1M: 0.696 },
  "openrouter:meta-llama/llama-4-scout": { inputCostPer1M: 0.1, outputCostPer1M: 0.3 },
  "openrouter:mistralai/mistral-medium-3-5": { inputCostPer1M: 1.5, outputCostPer1M: 7.5 },
  "openrouter:mistralai/mistral-small-2603": { inputCostPer1M: 0.15, outputCostPer1M: 0.6 },
  "openrouter:amazon/nova-pro-v1": { inputCostPer1M: 0.8, outputCostPer1M: 3.2 },
  "openrouter:amazon/nova-2-lite-v1": { inputCostPer1M: 0.3, outputCostPer1M: 2.5 },
  "openrouter:amazon/nova-lite-v1": { inputCostPer1M: 0.06, outputCostPer1M: 0.24 },
  "openrouter:tencent/hy3": { inputCostPer1M: 0.132, outputCostPer1M: 0.528 },
  "openrouter:anthropic/claude-haiku-4.5": { inputCostPer1M: 1, outputCostPer1M: 5 },
  "openrouter:google/gemma-4-26b-a4b-it": { inputCostPer1M: 0.07, outputCostPer1M: 0.34 },
  "openrouter:moonshotai/kimi-k2.5": { inputCostPer1M: 0.45, outputCostPer1M: 2.25 },
  "openrouter:z-ai/glm-4.7-flash": { inputCostPer1M: 0.0605, outputCostPer1M: 0.4 },
  "openrouter:nvidia/nemotron-3-nano-30b-a3b": { inputCostPer1M: 0.05, outputCostPer1M: 0.2 },
  // 2026-07-28 catalog widening — older generations kept selectable alongside
  // the new flagships. Rates from OpenRouter /api/v1/models (2026-07-28).
  "openrouter:anthropic/claude-sonnet-4.5": { inputCostPer1M: 3, outputCostPer1M: 15 },
  "openrouter:anthropic/claude-sonnet-4": { inputCostPer1M: 3, outputCostPer1M: 15 },
  "openrouter:anthropic/claude-opus-4.1": { inputCostPer1M: 15, outputCostPer1M: 75 },
  "openrouter:anthropic/claude-opus-4": { inputCostPer1M: 15, outputCostPer1M: 75 },
  "openrouter:anthropic/claude-3-haiku": { inputCostPer1M: 0.25, outputCostPer1M: 1.25 },
  "openrouter:z-ai/glm-5.1": { inputCostPer1M: 0.966, outputCostPer1M: 3.036 },
  "openrouter:z-ai/glm-4.7": { inputCostPer1M: 0.4, outputCostPer1M: 1.75 },
  "openrouter:z-ai/glm-4.6": { inputCostPer1M: 0.55, outputCostPer1M: 2.2 },
  "openrouter:z-ai/glm-4.5": { inputCostPer1M: 0.6, outputCostPer1M: 2.2 },
  "openrouter:z-ai/glm-4.5-air": { inputCostPer1M: 0.13, outputCostPer1M: 0.85 },
  "openrouter:qwen/qwen3-max": { inputCostPer1M: 0.78, outputCostPer1M: 3.9 },
  "openrouter:qwen/qwen3.6-plus": { inputCostPer1M: 0.325, outputCostPer1M: 1.95 },
  "openrouter:qwen/qwen3.6-flash": { inputCostPer1M: 0.1875, outputCostPer1M: 1.125 },
  "openrouter:qwen/qwen3.5-plus-20260420": { inputCostPer1M: 0.3, outputCostPer1M: 1.8 },
  "openrouter:mistralai/mistral-large-2512": { inputCostPer1M: 0.5, outputCostPer1M: 1.5 },
  "openrouter:mistralai/mistral-medium-3.1": { inputCostPer1M: 0.4, outputCostPer1M: 2 },
  "openrouter:mistralai/mistral-small-3.2-24b-instruct": { inputCostPer1M: 0.075, outputCostPer1M: 0.2 },
  "openrouter:minimax/minimax-m2.1": { inputCostPer1M: 0.3, outputCostPer1M: 1.2 },
  "openrouter:minimax/minimax-m2": { inputCostPer1M: 0.255, outputCostPer1M: 1.02 },
  "openrouter:minimax/minimax-m1": { inputCostPer1M: 0.4, outputCostPer1M: 2.2 },
  "openrouter:meta-llama/llama-3.3-70b-instruct": { inputCostPer1M: 0.1, outputCostPer1M: 0.32 },
  "openrouter:meta-llama/llama-3.1-70b-instruct": { inputCostPer1M: 0.4, outputCostPer1M: 0.4 },
  "openrouter:meta-llama/llama-3.1-8b-instruct": { inputCostPer1M: 0.05, outputCostPer1M: 0.08 },
  "openrouter:moonshotai/kimi-k2-thinking": { inputCostPer1M: 0.6, outputCostPer1M: 2.5 },
  "openrouter:moonshotai/kimi-k2": { inputCostPer1M: 0.57, outputCostPer1M: 2.3 },
  "openrouter:amazon/nova-premier-v1": { inputCostPer1M: 2.5, outputCostPer1M: 12.5 },
  "openrouter:google/gemini-2.5-flash-lite": { inputCostPer1M: 0.1, outputCostPer1M: 0.4 },
  "openrouter:x-ai/grok-4.20-multi-agent": { inputCostPer1M: 1.25, outputCostPer1M: 2.5 },
  "openrouter:tencent/hunyuan-a13b-instruct": { inputCostPer1M: 0.14, outputCostPer1M: 0.57 },
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
  // Legacy: ":free" models were dropped from the catalog (July 2026), but a
  // persisted session may still reference one — they billed $0.
  if (providerId === "openrouter" && modelId.endsWith(":free")) return ZERO_PRICE;
  return FALLBACK_PRICE;
}
