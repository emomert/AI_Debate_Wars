/**
 * Owner-set coin prices (docs/23_COINS.md): fighter A + fighter B,
 * legacy long length ×2, Deep Debate +2, Auto judge free.
 * A picked third-model judge costs its explicit model price separately.
 * Cost estimates are informational and must not automatically reprice coins.
 */

import { FREE_MAX_FIGHTER_COINS } from "./config";
import { getModelPrice } from "@/lib/cost/pricing";
import { getModelById } from "@/lib/models/modelRegistry";
import type { ResponseLength } from "@/lib/debate/debateTypes";

/**
 * Pack prices are intentionally unchanged. These are conservative planning
 * assumptions for a payment processor; they are not a promise of profit.
 * A fixed fee matters most for the smallest pack, so the 700-coin pack is the
 * least-revenue case used for cost planning.
 */
export const PROCESSOR_FEE_RATE = 0.1;
export const PROCESSOR_FIXED_FEE_USD = 0.3;

/** Nominal comparison value retained for display/compatibility only. */
export const COIN_USD = 0.05;

/** Flat Deep Debate add-on; daily coins may cover it. */
export const DEEP_DEBATE_COIN_SURCHARGE = 2;

export type CoinPrice = 1 | 2 | 4 | 8 | 12 | 20;

/** Owner-approved packs; checkout availability depends on Polar env + flag. */
export const COIN_PACKS: ReadonlyArray<{ usd: number; coins: number }> = [
  { usd: 4.99, coins: 100 },
  { usd: 9.99, coins: 250 },
  { usd: 19.99, coins: 700 },
];

/** Net cash and net cash per coin after the conservative processor allowance. */
export function netPackRevenueUsd(pack: { usd: number; coins: number }): number {
  return Math.max(0, pack.usd * (1 - PROCESSOR_FEE_RATE) - PROCESSOR_FIXED_FEE_USD);
}

export function netCoinUsd(pack: { usd: number; coins: number }): number {
  return netPackRevenueUsd(pack) / pack.coins;
}

/** The least revenue a coin can represent across the currently offered packs. */
export const LOWEST_NET_COIN_USD = Math.min(...COIN_PACKS.map(netCoinUsd));

/** Explicit per-fighter prices; preserve existing prices when adding models. */
export const MODEL_COINS: Readonly<Record<string, CoinPrice>> = {
  // September 2026 additions on the existing coin scale.
  "gpt-6-astra": 20,
  "deepseek-v4-flash-vision-exp": 1,
  "anthropic/claude-fable-5.1": 20,
  "qwen/qwen3.8-max-0902": 4,
  "qwen/qwen3.8-27b": 2,
  "qwen/qwen3.8-2.4t-a95b": 4,
  "google/gemini-3.8-flash": 2,
  "google/gemini-3.7-flash": 2,
  "x-ai/grok-4.6": 4,
  "z-ai/glm-5.3": 2,
  "z-ai/glm-5.3-flash": 1,
  "tencent/hy4-preview": 2,
  "meta/muse-glimmer-30b": 1,
  // ── 1 coin (Budget) ─────────────────────────────
  "gpt-5.4-mini": 1,
  "gpt-5.4-nano": 1,
  "gpt-5-mini": 1,
  "gpt-5-nano": 1,
  "gpt-4.1-mini": 1,
  "gpt-4.1-nano": 1,
  "gpt-4o-mini": 1,
  "deepseek-v4-pro": 1,
  "deepseek-v4-flash": 1,
  "xiaomi/mimo-v2.5-pro": 1,
  "xiaomi/mimo-v2.5": 1,
  "z-ai/glm-5.2": 1,
  "z-ai/glm-4.7-flash": 1,
  "qwen/qwen3.7-plus": 1,
  "qwen/qwen3.7-flash": 1,
  "minimax/minimax-m3": 1,
  "minimax/minimax-m2.7": 1,
  "minimax/minimax-m2.5": 1,
  "nvidia/nemotron-3-super-120b-a12b": 1,
  "nvidia/nemotron-3-nano-30b-a3b": 1,
  "google/gemini-3.1-flash-lite": 1,
  "google/gemini-3.5-flash-lite": 1,
  "google/gemma-4-26b-a4b-it": 1,
  "meta-llama/llama-4-maverick": 1,
  "meta-llama/llama-4-scout": 1,
  "mistralai/mistral-small-2603": 1,
  "amazon/nova-lite-v1": 1,
  "amazon/nova-2-lite-v1": 1,
  "tencent/hy3": 1,
  "anthropic/claude-3-haiku": 1,
  "z-ai/glm-4.5-air": 1,
  "qwen/qwen3-max": 1,
  "qwen/qwen3.6-flash": 1,
  "mistralai/mistral-large-2512": 1,
  "mistralai/mistral-medium-3.1": 1,
  "mistralai/mistral-small-3.2-24b-instruct": 1,
  "minimax/minimax-m2.1": 1,
  "minimax/minimax-m2": 1,
  "meta-llama/llama-3.3-70b-instruct": 1,
  "meta-llama/llama-3.1-70b-instruct": 1,
  "meta-llama/llama-3.1-8b-instruct": 1,
  "moonshotai/kimi-k2": 1,
  "google/gemini-2.5-flash-lite": 1,
  "tencent/hunyuan-a13b-instruct": 1,
  // ── 2 coins (Standard — ≤ $0.02) ───────────────────────────────────────
  "gpt-4.1": 2,
  "gpt-4o": 2,
  "x-ai/grok-4.3": 2,
  "x-ai/grok-4.20": 2,
  "z-ai/glm-5": 2,
  "moonshotai/kimi-k2.6": 2,
  "moonshotai/kimi-k2.7-code": 2,
  "moonshotai/kimi-k2.5": 2,
  "nvidia/nemotron-3-ultra-550b-a55b": 2,
  "qwen/qwen3.7-max": 2,
  "google/gemini-2.5-flash": 2,
  "amazon/nova-pro-v1": 2,
  "anthropic/claude-haiku-4.5": 2,
  "z-ai/glm-5.1": 2,
  "z-ai/glm-4.7": 2,
  "z-ai/glm-4.6": 2,
  "z-ai/glm-4.5": 2,
  "qwen/qwen3.6-plus": 2,
  "qwen/qwen3.5-plus-20260420": 2,
  "minimax/minimax-m1": 2,
  "moonshotai/kimi-k2-thinking": 2,
  "amazon/nova-premier-v1": 2,
  "x-ai/grok-4.20-multi-agent": 2,
  // ── 4 coins (Premium — ≤ $0.04; the free-tier ceiling) ─────────────────
  "gpt-5.6-luna": 4,
  "x-ai/grok-4.5": 4,
  "anthropic/claude-sonnet-5": 4,
  "google/gemini-3.5-flash": 4,
  "google/gemini-3.6-flash": 4,
  "google/gemini-2.5-pro": 4,
  "mistralai/mistral-medium-3-5": 4,
  "anthropic/claude-sonnet-4.5": 4,
  "anthropic/claude-sonnet-4": 4,
  // ── 8 coins (Elite — ≤ $0.08) ──────────────────────────────────────────
  "gpt-5.6-terra": 8,
  "gpt-5.4": 8,
  "anthropic/claude-sonnet-4.6": 8,
  "moonshotai/kimi-k3": 8,
  // ── 12 coins (Flagship — ≤ $0.12) ──────────────────────────────────────
  "gpt-5.6-sol": 12,
  "gpt-5.5": 12,
  "anthropic/claude-opus-5": 12,
  "anthropic/claude-opus-4.8": 12,
  "anthropic/claude-opus-4.7": 12,
  "anthropic/claude-opus-4.6": 12,
  "anthropic/claude-opus-4.5": 12,
  "anthropic/claude-opus-4.1": 12,
  "anthropic/claude-opus-4": 12,
  // ── 20 coins (Boss) ────────────────────────────────────────────────────
  "anthropic/claude-fable-5": 20,
};

/** Unknown/legacy ids (removed models in old sessions) price defensively. */
const FALLBACK_COINS: CoinPrice = 2;

export function coinPriceForModel(modelId: string): CoinPrice {
  return MODEL_COINS[modelId] ?? FALLBACK_COINS;
}

export interface CoinCostInput {
  modelAId: string;
  modelBId: string;
  deepDebate: boolean;
  responseLength: ResponseLength;
}

/** A judge's config, as far as pricing cares. Only a picked `thirdModel` judge
 *  costs coins; Auto and fighter-as-judge (`modelA`/`modelB`) are free. */
export interface JudgeCostInput {
  mode: string;
  modelId?: string;
}

const lengthMultiplier = (l: ResponseLength) => (l === "long" ? 2 : 1);

/** Total coins a MATCH charges (fighters only — the judge is separate):
 *  (A + B) × lengthMult, +2 for Deep Debate. */
export function matchCoinCost(input: CoinCostInput): number {
  const fighters = coinPriceForModel(input.modelAId) + coinPriceForModel(input.modelBId);
  return fighters * lengthMultiplier(input.responseLength) + (input.deepDebate ? DEEP_DEBATE_COIN_SURCHARGE : 0);
}

/**
 * The premium share of a match — the fighter coins daily free coins may NOT pay
 * (fighters above FREE_MAX_FIGHTER_COINS with the length multiplier). The deep
 * surcharge and free-band models stay daily-eligible.
 */
export function premiumCoinCost(input: CoinCostInput): number {
  const premium = [input.modelAId, input.modelBId]
    .map(coinPriceForModel)
    .filter((c) => c > FREE_MAX_FIGHTER_COINS)
    .reduce((s, c) => s + c, 0);
  return premium * lengthMultiplier(input.responseLength);
}

/**
 * A judge's coin price, charged at the verdict route (decoupled from the match
 * charge 2026-07-13 to close the free-premium-judge bypass — the judge is now
 * always priced from the RESOLVED judge, never a client-supplied ordinal).
 * Auto and fighter-as-judge are free; a picked third-model judge costs its
 * flat coin price (one verdict — no length multiplier).
 */
export function judgeCoinCost(judge: JudgeCostInput | undefined): number {
  if (!judge || judge.mode !== "thirdModel" || !judge.modelId) return 0;
  return coinPriceForModel(judge.modelId);
}

/** The share of a judge charge that only purchased/promo coins may pay (a
 *  picked judge above the free band). */
export function judgePremiumCoinCost(judge: JudgeCostInput | undefined): number {
  const c = judgeCoinCost(judge);
  return c > FREE_MAX_FIGHTER_COINS ? c : 0;
}

/* ---- informational cost model, separate from coin prices ---- */

/**
 * These values describe a three-round match and intentionally include costs
 * that the provider usage ledger may not see on a failed attempt. They are
 * planning inputs, not a guarantee of the provider invoice.
 */
export const ECONOMY_ASSUMPTIONS = {
  /** Observed aggregate input/output over three short rounds. */
  fighterInputTokens: 2680,
  shortOutputTokens: 900,
  /** Hidden reasoning headroom observed on reasoning models. */
  reasoningTokens: 3000,
  /** Deep Debate's longer 350–600 word response budget over three rounds. */
  deepOutputTokens: 4500,
  deepInputTokens: 5200,
  /** OpenRouter/Brave charge one web query per fighter turn. */
  deepSearchesPerFighter: 3,
  deepSearchCostUsd: 0.005,
  /** Expected retry allowance and non-provider operating overhead. */
  retryAllowance: 0.2,
  operatingOverhead: 0.1,
  /** Judge prompt is the completed transcript plus a structured verdict. */
  judgeInputTokens: 6500,
  deepJudgeInputTokens: 12000,
  judgeOutputTokens: 700,
} as const;

const OUTPUT_TOKENS_BY_LENGTH: Record<ResponseLength, number> = {
  short: ECONOMY_ASSUMPTIONS.shortOutputTokens,
  medium: 1500,
  long: 2400,
  punchy: 300,
};

/** OpenAI ids that reason internally (the registry's reasoningEffort field
 *  only exists for OpenRouter models, where OpenRouter caps the effort). */
const OPENAI_REASONING = new Set(["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5.4"]);
const DEEPSEEK_REASONING = new Set(["deepseek-v4-pro", "deepseek-v4-flash", "deepseek-v4-flash-vision-exp"]);

/**
 * OpenRouter models that think BY DEFAULT but carry no `reasoningEffort` tag.
 * Measured 2026-07-28: each burns hundreds of thinking tokens bare, and
 * effort:"low" does NOT reduce them (it raises them, or does nothing) — so the
 * tag is correctly absent, yet the tokens are still billed. Without this set
 * the estimator would undercount their provider cost. Probe before adding here, exactly as for the tag itself (docs/07).
 */
const OPENROUTER_DEFAULT_THINKERS = new Set([
  "google/gemini-3.7-flash", // Sept 8 probe: 289 bare -> 304 with low; leave uncapped.
  "z-ai/glm-4.7", // 816 thinking bare -> 971 with effort:"low"
  "z-ai/glm-4.5", // 867 -> 883
  "z-ai/glm-4.5-air", // 299 -> 380
  "minimax/minimax-m2", // 403 -> 662
  "minimax/minimax-m1", // 120 -> 134
]);

function isReasoningModel(modelId: string, modelReasoningEffort?: string): boolean {
  // Every GPT-5/GPT-6 model can bill hidden reasoning tokens, including mini
  // and nano variants whose registry entries do not carry a reasoning tag.
  return (
    Boolean(modelReasoningEffort) ||
    /^gpt-([56])(?:[.-]|$)/.test(modelId) ||
    OPENAI_REASONING.has(modelId) ||
    DEEPSEEK_REASONING.has(modelId) ||
    OPENROUTER_DEFAULT_THINKERS.has(modelId)
  );
}

function conservativeMultiplier(): number {
  return (1 + ECONOMY_ASSUMPTIONS.retryAllowance) * (1 + ECONOMY_ASSUMPTIONS.operatingOverhead);
}

function inputRate(modelId: string): number {
  const entry = getModelById(modelId);
  const providerId = entry?.providerId ?? "openrouter";
  const price = getModelPrice(providerId, modelId);
  // Use the higher cache-write rate where one is published. This avoids
  // assuming that every prompt prefix is a cache hit during a cold run.
  return Math.max(price.inputCostPer1M, price.cacheWriteInputCostPer1M ?? 0);
}

export interface EstimateOptions {
  responseLength?: ResponseLength;
  deepDebate?: boolean;
}

/** Estimated provider + retry/overhead cost for one fighter. */
export function estimatedFighterCostUsd(modelId: string, options: EstimateOptions = {}): number {
  const entry = getModelById(modelId);
  const providerId = entry?.providerId ?? "openrouter";
  const price = getModelPrice(providerId, modelId);
  const deep = options.deepDebate === true;
  const length = options.responseLength ?? "short";
  const inputTokens = deep ? ECONOMY_ASSUMPTIONS.deepInputTokens : ECONOMY_ASSUMPTIONS.fighterInputTokens;
  const visibleOutputTokens = deep
    ? ECONOMY_ASSUMPTIONS.deepOutputTokens
    : OUTPUT_TOKENS_BY_LENGTH[length];
  const reasoningTokens = isReasoningModel(modelId, entry?.reasoningEffort)
    ? ECONOMY_ASSUMPTIONS.reasoningTokens
    : 0;
  const providerCost =
    (inputTokens * inputRate(modelId) + (visibleOutputTokens + reasoningTokens) * price.outputCostPer1M) / 1e6;
  const searchCost = deep
    ? ECONOMY_ASSUMPTIONS.deepSearchesPerFighter * ECONOMY_ASSUMPTIONS.deepSearchCostUsd
    : 0;
  return (providerCost + searchCost) * conservativeMultiplier();
}

/** Estimated cost of one structured verdict (the verdict itself is one call). */
export function estimatedJudgeCostUsd(modelId: string, options: EstimateOptions = {}): number {
  const entry = getModelById(modelId);
  const providerId = entry?.providerId ?? "openrouter";
  const price = getModelPrice(providerId, modelId);
  const inputTokens = options.deepDebate
    ? ECONOMY_ASSUMPTIONS.deepJudgeInputTokens
    : ECONOMY_ASSUMPTIONS.judgeInputTokens;
  const reasoningTokens = isReasoningModel(modelId, entry?.reasoningEffort)
    ? ECONOMY_ASSUMPTIONS.reasoningTokens
    : 0;
  const providerCost =
    (inputTokens * inputRate(modelId) +
      (ECONOMY_ASSUMPTIONS.judgeOutputTokens + reasoningTokens) * price.outputCostPer1M) /
    1e6;
  return providerCost * conservativeMultiplier();
}

/**
 * Auto is free to the user, but its provider call is included in the match's
 * economic budget. Use the most expensive preferred auto candidate so this
 * remains safe when only a different backend key is configured.
 */
const AUTO_JUDGE_CANDIDATES = [
  "gpt-4.1-mini",
  "gpt-4o-mini",
  "gpt-4.1",
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "google/gemini-3.1-flash-lite",
  "xiaomi/mimo-v2.5",
  "z-ai/glm-5.2",
] as const;

export function estimatedAutoJudgeCostUsd(options: EstimateOptions = {}): number {
  return Math.max(...AUTO_JUDGE_CANDIDATES.map((id) => estimatedJudgeCostUsd(id, options)));
}

/** Gross provider cost for a complete match, including the included Auto judge. */
export function estimatedMatchCostUsd(
  input: CoinCostInput,
  judge: JudgeCostInput = { mode: "auto" },
): number {
  const options = { responseLength: input.responseLength, deepDebate: input.deepDebate };
  const fighters = estimatedFighterCostUsd(input.modelAId, options) + estimatedFighterCostUsd(input.modelBId, options);
  const judgeCost =
    judge.mode === "thirdModel" && judge.modelId
      ? estimatedJudgeCostUsd(judge.modelId, options)
      : estimatedAutoJudgeCostUsd(options);
  return fighters + judgeCost;
}
