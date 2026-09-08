/**
 * The coin economy (docs/23_COINS.md).
 *
 * One rule users see: a match costs fighter A + fighter B coins. Modifiers:
 * long length ×2 (on the fighter total), a 4-coin included Auto allocation,
 * and Deep Debate +20 flat. The judge is
 * priced separately at the verdict route (Auto is free; a picked third-model
 * judge costs its coin price) — see judgeCoinCost.
 *
 * Coin prices are an EXPLICIT per-model map (auditable, owner-approved) derived
 * from conservative per-match API estimates. The price floor uses the least
 * valuable pack after a processor fee allowance (not the nominal 5¢ value).
 * The old 1/2/4/8/12/20 bands are retained as source bands below and uplifted
 * into the current 4/12/40/80/160 bands. This keeps every catalog id explicit
 * while making long/deep matches and the included Auto judge pay their costs.
 * economy.test.ts enforces coverage, net-pack margins, and deep-match
 * combinations against pricing.ts, so a price drift or a new model without a
 * coin price fails the test suite, which runs in the GitHub Actions workflow.
 */

import { FREE_MAX_FIGHTER_COINS } from "./config";
import { getModelPrice } from "@/lib/cost/pricing";
import { getModelById } from "@/lib/models/modelRegistry";
import type { ResponseLength } from "@/lib/debate/debateTypes";

/**
 * Pack prices are intentionally unchanged. These are conservative planning
 * assumptions for a payment processor; they are not a promise of profit.
 * A fixed fee matters most for the smallest pack, so the 700-coin pack is the
 * least-revenue case used by the margin invariant.
 */
export const PROCESSOR_FEE_RATE = 0.1;
export const PROCESSOR_FIXED_FEE_USD = 0.3;

/** Nominal comparison value retained for display/compatibility only. */
export const COIN_USD = 0.05;

/** Every band must clear this multiple of estimated API cost at retail. */
export const MIN_MARGIN_MULTIPLE = 5;
/** Coins allocated to the verdict call that is included with every match. */
export const INCLUDED_AUTO_JUDGE_COIN_ALLOCATION = 4;
/** Search + longer-output add-on. It is purchased balance, even for free-tier fighters. */
export const DEEP_DEBATE_COIN_SURCHARGE = 20;

export type CoinPrice = 4 | 8 | 12 | 40 | 80 | 160;

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

/** Per-fighter coin price, per match. Explicit so a review can eyeball it. */
type LegacyCoinPrice = 1 | 2 | 4 | 8 | 12 | 20;

const BASE_MODEL_COINS: Readonly<Record<string, LegacyCoinPrice>> = {
  // September 2026 additions; estimates include hidden reasoning.
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
  // ── Source band 1 (Budget) ──────────────────────────────────────────────
  "gpt-5.4-mini": 1,
  "gpt-5.4-nano": 1,
  "gpt-5-mini": 1,
  "gpt-5-nano": 1,
  "gpt-4.1-mini": 1,
  "gpt-4.1-nano": 1,
  "gpt-4o-mini": 1,
  "deepseek-v4-flash": 1,
  "xiaomi/mimo-v2.5-pro": 1,
  "xiaomi/mimo-v2.5": 1,
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
  // ── Source band 2 (Standard) ───────────────────────────────────────────
  "deepseek-v4-pro": 2,
  "z-ai/glm-5.2": 2,
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
  // ── Source band 4 (Premium) ─────────────────────────────────────────────
  "gpt-5.6-luna": 4,
  "x-ai/grok-4.5": 4,
  "anthropic/claude-sonnet-5": 4,
  "google/gemini-3.5-flash": 4,
  // 3.6 Flash thinks by default; the thinking-inclusive estimate needs 4.
  "google/gemini-3.6-flash": 4,
  "google/gemini-2.5-pro": 4,
  "mistralai/mistral-medium-3-5": 4,
  "anthropic/claude-sonnet-4.5": 4,
  "anthropic/claude-sonnet-4": 4,
  // ── Source band 8 (Elite) ───────────────────────────────────────────────
  "gpt-5.6-terra": 8,
  "gpt-5.4": 8,
  "anthropic/claude-sonnet-4.6": 8,
  // Kimi K3 is priced like Sonnet 4.6 ($3/$15) AND thinks by default; its
  // billable uplift is applied in ECONOMIC_BANDS below.
  "moonshotai/kimi-k3": 8,
  // ── Source band 12 (Flagship) ───────────────────────────────────────────
  "gpt-5.6-sol": 12,
  "gpt-5.5": 12,
  "anthropic/claude-opus-5": 12,
  "anthropic/claude-opus-4.8": 12,
  "anthropic/claude-opus-4.7": 12,
  "anthropic/claude-opus-4.6": 12,
  "anthropic/claude-opus-4.5": 12,
  "anthropic/claude-opus-4.1": 12,
  "anthropic/claude-opus-4": 12,
  // ── Source band 20 (Boss) ───────────────────────────────────────────────
  "anthropic/claude-fable-5": 20,
};

/**
 * Economic uplift from the legacy editorial bands. A model's source band is
 * still easy to review above, while the exported map is the billable price
 * used by both client previews and server charging.
 */
const ECONOMIC_BANDS: Record<LegacyCoinPrice, CoinPrice> = {
  1: 4,
  2: 12,
  4: 40,
  8: 80,
  12: 160,
  20: 160,
};

/** A small set of low-cost standard models stays inside the daily free band. */
const FREE_STANDARD_MODELS = new Set([
  "google/gemini-2.5-flash",
  "amazon/nova-pro-v1",
  "minimax/minimax-m1",
  "x-ai/grok-4.20",
  "z-ai/glm-4.7",
  "z-ai/glm-4.5",
  "anthropic/claude-haiku-4.5",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "qwen/qwen3.6-plus",
  "qwen/qwen3.5-plus-20260420",
  "z-ai/glm-5",
]);

function billableBand(id: string, sourceBand: LegacyCoinPrice): CoinPrice {
  const editorialBand = FREE_STANDARD_MODELS.has(id) ? 4 : ECONOMIC_BANDS[sourceBand];
  // GPT-5/GPT-6 bill hidden reasoning even when the catalog entry has no
  // reasoningEffort field. Keep their smallest family members out of the free
  // band; the deep/long floor requires the 40-coin tier for them.
  if ((/^gpt-[56](?:[.-]|$)/.test(id) || id === "gpt-4.1" || id === "gpt-4o") && editorialBand < 40) return 40;
  return editorialBand;
}

export const MODEL_COINS: Readonly<Record<string, CoinPrice>> = Object.fromEntries(
  Object.entries(BASE_MODEL_COINS).map(([id, sourceBand]) => [
    id,
    billableBand(id, sourceBand),
  ]),
) as Readonly<Record<string, CoinPrice>>;

/** Unknown/legacy ids (removed models in old sessions) price defensively. */
const FALLBACK_COINS: CoinPrice = 12;

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
 *  (A + B) × lengthMult, +INCLUDED_AUTO_JUDGE_COIN_ALLOCATION for the included
 *  Auto verdict, and +DEEP_DEBATE_COIN_SURCHARGE for Deep Debate. Deep Debate is a paid add-on:
 *  it buys six search calls and the longer response budget, so the surcharge
 *  is included in premiumCoinCost too.
 */
export function matchCoinCost(input: CoinCostInput): number {
  const fighters = coinPriceForModel(input.modelAId) + coinPriceForModel(input.modelBId);
  return fighters * lengthMultiplier(input.responseLength) +
    INCLUDED_AUTO_JUDGE_COIN_ALLOCATION +
    (input.deepDebate ? DEEP_DEBATE_COIN_SURCHARGE : 0);
}

/**
 * The premium share of a match — the fighter coins daily free coins may NOT pay
 * (fighters above FREE_MAX_FIGHTER_COINS with the length multiplier), plus the
 * metered Deep Debate add-on.
 */
export function premiumCoinCost(input: CoinCostInput): number {
  const premium = [input.modelAId, input.modelBId]
    .map(coinPriceForModel)
    .filter((c) => c > FREE_MAX_FIGHTER_COINS)
    .reduce((s, c) => s + c, 0);
  return premium * lengthMultiplier(input.responseLength) +
    (input.deepDebate ? DEEP_DEBATE_COIN_SURCHARGE : 0);
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

/* ---- conservative cost model used by the economic invariants ---- */

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
 * the estimator would price them as non-reasoners and the margin floor would be
 * fiction. Probe before adding here, exactly as for the tag itself (docs/07).
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
