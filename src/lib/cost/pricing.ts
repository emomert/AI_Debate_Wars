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

// USD per 1M tokens for the cost engine (spend caps + persisted summaries; the
// cost UI itself is currently hidden — see lib/cost/uiConfig.ts). Standard,
// CACHED and output rates verified against the providers' official pricing
// pages (OpenAI: developers.openai.com/api/docs/pricing, July 2026; DeepSeek:
// api-docs.deepseek.com, June 2026) and OpenRouter's live /api/v1/models list
// (2026-07-11). The cost engine bills the cache-hit portion of input at
// cachedInputCostPer1M. OpenRouter entries deliberately set NO cached rate
// (cache billing varies per upstream provider) — costs err slightly HIGH, which
// keeps the spend caps conservative.
export const modelPricing: Record<string, ModelPrice> = {
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
  // DeepSeek — verified June 2026 (cache-miss / cache-hit input; output).
  "deepseek:deepseek-v4-pro": { inputCostPer1M: 0.435, cachedInputCostPer1M: 0.003625, outputCostPer1M: 0.87 },
  "deepseek:deepseek-v4-flash": { inputCostPer1M: 0.14, cachedInputCostPer1M: 0.0028, outputCostPer1M: 0.28 },
  // OpenRouter — paid catalog, rates from /api/v1/models (2026-07-11).
  // xAI
  "openrouter:x-ai/grok-4.5": { inputCostPer1M: 2.0, outputCostPer1M: 6.0 },
  "openrouter:x-ai/grok-4.3": { inputCostPer1M: 1.25, outputCostPer1M: 2.5 },
  "openrouter:x-ai/grok-4.20": { inputCostPer1M: 1.25, outputCostPer1M: 2.5 },
  // Anthropic
  "openrouter:anthropic/claude-fable-5": { inputCostPer1M: 10.0, outputCostPer1M: 50.0 },
  "openrouter:anthropic/claude-opus-5": { inputCostPer1M: 5.0, outputCostPer1M: 25.0 },
  "openrouter:anthropic/claude-opus-4.8": { inputCostPer1M: 5.0, outputCostPer1M: 25.0 },
  "openrouter:anthropic/claude-opus-4.7": { inputCostPer1M: 5.0, outputCostPer1M: 25.0 },
  "openrouter:anthropic/claude-opus-4.6": { inputCostPer1M: 5.0, outputCostPer1M: 25.0 },
  "openrouter:anthropic/claude-opus-4.5": { inputCostPer1M: 5.0, outputCostPer1M: 25.0 },
  "openrouter:anthropic/claude-sonnet-5": { inputCostPer1M: 2.0, outputCostPer1M: 10.0 },
  "openrouter:anthropic/claude-sonnet-4.6": { inputCostPer1M: 3.0, outputCostPer1M: 15.0 },
  // Google
  "openrouter:google/gemini-3.6-flash": { inputCostPer1M: 1.5, outputCostPer1M: 7.5 },
  "openrouter:google/gemini-3.5-flash": { inputCostPer1M: 1.5, outputCostPer1M: 9.0 },
  "openrouter:google/gemini-3.5-flash-lite": { inputCostPer1M: 0.3, outputCostPer1M: 2.5 },
  "openrouter:google/gemini-3.1-flash-lite": { inputCostPer1M: 0.25, outputCostPer1M: 1.5 },
  "openrouter:google/gemini-2.5-pro": { inputCostPer1M: 1.25, outputCostPer1M: 10.0 },
  "openrouter:google/gemini-2.5-flash": { inputCostPer1M: 0.3, outputCostPer1M: 2.5 },
  // Xiaomi
  "openrouter:xiaomi/mimo-v2.5-pro": { inputCostPer1M: 0.435, outputCostPer1M: 0.87 },
  "openrouter:xiaomi/mimo-v2.5": { inputCostPer1M: 0.105, outputCostPer1M: 0.28 },
  // Z.AI
  "openrouter:z-ai/glm-5.2": { inputCostPer1M: 0.42, outputCostPer1M: 1.32 },
  "openrouter:z-ai/glm-5": { inputCostPer1M: 0.6, outputCostPer1M: 1.92 },
  // Moonshot
  "openrouter:moonshotai/kimi-k3": { inputCostPer1M: 3.0, outputCostPer1M: 15.0 },
  "openrouter:moonshotai/kimi-k2.6": { inputCostPer1M: 0.66, outputCostPer1M: 3.41 },
  "openrouter:moonshotai/kimi-k2.7-code": { inputCostPer1M: 0.72, outputCostPer1M: 3.49 },
  // NVIDIA
  "openrouter:nvidia/nemotron-3-ultra-550b-a55b": { inputCostPer1M: 0.5, outputCostPer1M: 2.2 },
  "openrouter:nvidia/nemotron-3-super-120b-a12b": { inputCostPer1M: 0.08, outputCostPer1M: 0.45 },
  // Qwen
  "openrouter:qwen/qwen3.7-max": { inputCostPer1M: 1.25, outputCostPer1M: 3.75 },
  "openrouter:qwen/qwen3.7-plus": { inputCostPer1M: 0.32, outputCostPer1M: 1.28 },
  "openrouter:qwen/qwen3.7-flash": { inputCostPer1M: 0.03, outputCostPer1M: 0.13 },
  // MiniMax
  "openrouter:minimax/minimax-m3": { inputCostPer1M: 0.3, outputCostPer1M: 1.2 },
  "openrouter:minimax/minimax-m2.7": { inputCostPer1M: 0.24, outputCostPer1M: 0.96 },
  "openrouter:minimax/minimax-m2.5": { inputCostPer1M: 0.15, outputCostPer1M: 0.9 },
  // July 2026 expansion — rates from OpenRouter /api/v1/models (2026-07-12).
  "openrouter:meta-llama/llama-4-maverick": { inputCostPer1M: 0.2, outputCostPer1M: 0.8 },
  "openrouter:meta-llama/llama-4-scout": { inputCostPer1M: 0.1, outputCostPer1M: 0.3 },
  "openrouter:mistralai/mistral-medium-3-5": { inputCostPer1M: 1.5, outputCostPer1M: 7.5 },
  "openrouter:mistralai/mistral-small-2603": { inputCostPer1M: 0.15, outputCostPer1M: 0.6 },
  "openrouter:amazon/nova-pro-v1": { inputCostPer1M: 0.8, outputCostPer1M: 3.2 },
  "openrouter:amazon/nova-2-lite-v1": { inputCostPer1M: 0.3, outputCostPer1M: 2.5 },
  "openrouter:amazon/nova-lite-v1": { inputCostPer1M: 0.06, outputCostPer1M: 0.24 },
  "openrouter:tencent/hy3": { inputCostPer1M: 0.14, outputCostPer1M: 0.58 },
  "openrouter:anthropic/claude-haiku-4.5": { inputCostPer1M: 1.0, outputCostPer1M: 5.0 },
  "openrouter:google/gemma-4-26b-a4b-it": { inputCostPer1M: 0.06, outputCostPer1M: 0.33 },
  "openrouter:moonshotai/kimi-k2.5": { inputCostPer1M: 0.375, outputCostPer1M: 2.025 },
  "openrouter:z-ai/glm-4.7-flash": { inputCostPer1M: 0.06, outputCostPer1M: 0.4 },
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
  "openrouter:z-ai/glm-4.6": { inputCostPer1M: 0.5, outputCostPer1M: 2 },
  "openrouter:z-ai/glm-4.5": { inputCostPer1M: 0.6, outputCostPer1M: 2.2 },
  "openrouter:z-ai/glm-4.5-air": { inputCostPer1M: 0.13, outputCostPer1M: 0.85 },
  "openrouter:qwen/qwen3-max": { inputCostPer1M: 0.78, outputCostPer1M: 3.9 },
  "openrouter:qwen/qwen3.6-plus": { inputCostPer1M: 0.325, outputCostPer1M: 1.95 },
  "openrouter:qwen/qwen3.6-flash": { inputCostPer1M: 0.1875, outputCostPer1M: 1.125 },
  "openrouter:qwen/qwen3.5-plus-20260420": { inputCostPer1M: 0.3, outputCostPer1M: 1.8 },
  "openrouter:mistralai/mistral-large-2512": { inputCostPer1M: 0.5, outputCostPer1M: 1.5 },
  "openrouter:mistralai/mistral-medium-3.1": { inputCostPer1M: 0.4, outputCostPer1M: 2 },
  "openrouter:mistralai/mistral-small-3.2-24b-instruct": { inputCostPer1M: 0.1, outputCostPer1M: 0.3 },
  "openrouter:minimax/minimax-m2.1": { inputCostPer1M: 0.3, outputCostPer1M: 1.2 },
  "openrouter:minimax/minimax-m2": { inputCostPer1M: 0.255, outputCostPer1M: 1.02 },
  "openrouter:minimax/minimax-m1": { inputCostPer1M: 0.55, outputCostPer1M: 2.2 },
  "openrouter:meta-llama/llama-3.3-70b-instruct": { inputCostPer1M: 0.13, outputCostPer1M: 0.4 },
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
