/**
 * The coin economy (docs/23_COINS.md).
 *
 * One rule users see: a match costs fighter A + fighter B coins. Modifiers:
 * long length ×2 (on the fighter total), Deep Debate +2 flat. The judge is
 * priced separately at the verdict route (Auto is free; a picked third-model
 * judge costs its coin price) — see judgeCoinCost.
 *
 * Coin prices are an EXPLICIT per-model map (auditable, owner-approved) derived
 * from real per-match API cost bands — 1 (≤$0.0065) · 2 (≤$0.02) · 4 (≤$0.04) ·
 * 8 (≤$0.08) · 12 (≤$0.12) · 20 — sized so every band clears MIN_MARGIN_MULTIPLE
 * at COIN_USD retail. economy.test.ts enforces catalog coverage AND the margin
 * floor against pricing.ts on every run, so a price drift or a new model
 * without a coin price fails CI instead of silently losing money.
 */

import { FREE_MAX_FIGHTER_COINS } from "./config";
import { getModelPrice } from "@/lib/cost/pricing";
import { getModelById } from "@/lib/models/modelRegistry";
import type { ResponseLength } from "@/lib/debate/debateTypes";

/** Retail value of one coin (packs sell at ~this rate). */
export const COIN_USD = 0.05;

/** Every band must clear this multiple of estimated API cost at retail. */
export const MIN_MARGIN_MULTIPLE = 5;

export type CoinPrice = 1 | 2 | 4 | 8 | 12 | 20;

/** Owner-approved pack tiers (buy buttons live on /pricing; Polar wiring is
 *  the next step — until then they render disabled "coming soon"). */
export const COIN_PACKS: ReadonlyArray<{ usd: number; coins: number }> = [
  { usd: 4.99, coins: 100 },
  { usd: 9.99, coins: 250 },
  { usd: 19.99, coins: 700 },
];

/** Per-fighter coin price, per match. Explicit so a review can eyeball it. */
const MODEL_COINS: Record<string, CoinPrice> = {
  // ── 1 coin (Budget — cost ≤ $0.0065/match) ─────────────────────────────
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
  "minimax/minimax-m3": 1,
  "minimax/minimax-m2.7": 1,
  "minimax/minimax-m2.5": 1,
  "nvidia/nemotron-3-super-120b-a12b": 1,
  "nvidia/nemotron-3-nano-30b-a3b": 1,
  "google/gemini-3.1-flash-lite": 1,
  "google/gemma-4-26b-a4b-it": 1,
  "meta-llama/llama-4-maverick": 1,
  "meta-llama/llama-4-scout": 1,
  "mistralai/mistral-small-2603": 1,
  "amazon/nova-lite-v1": 1,
  "tencent/hy3": 1,
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
  // ── 4 coins (Premium — ≤ $0.04; the free-tier ceiling) ─────────────────
  "gpt-5.6-luna": 4,
  "x-ai/grok-4.5": 4,
  "anthropic/claude-sonnet-5": 4,
  "google/gemini-3.5-flash": 4,
  "google/gemini-2.5-pro": 4,
  "mistralai/mistral-medium-3-5": 4,
  // ── 8 coins (Elite — ≤ $0.08) ──────────────────────────────────────────
  "gpt-5.6-terra": 8,
  "gpt-5.4": 8,
  "anthropic/claude-sonnet-4.6": 8,
  // Kimi K3 is priced like Sonnet 4.6 ($3/$15) AND thinks by default, so its
  // thinking-inclusive estimate ($0.0575) only clears the 5x floor from 8 up.
  "moonshotai/kimi-k3": 8,
  // ── 12 coins (Flagship — ≤ $0.12) ──────────────────────────────────────
  "gpt-5.6-sol": 12,
  "gpt-5.5": 12,
  "anthropic/claude-opus-5": 12,
  "anthropic/claude-opus-4.8": 12,
  "anthropic/claude-opus-4.7": 12,
  "anthropic/claude-opus-4.6": 12,
  "anthropic/claude-opus-4.5": 12,
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
  return fighters * lengthMultiplier(input.responseLength) + (input.deepDebate ? 2 : 0);
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

/* ---- cost model for the margin test (mirrors the monetization report) ---- */

/** Observed per-fighter usage across 3 short rounds (real matches, 2026-07-12). */
const PROFILE = { inTokens: 2680, outTokens: 900, thinkingTokens: 2400 };

/** OpenAI ids that reason internally (the registry's reasoningEffort field
 *  only exists for OpenRouter models, where OpenRouter caps the effort). */
const OPENAI_REASONING = new Set(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5.4"]);
const DEEPSEEK_REASONING = new Set(["deepseek-v4-pro"]);

/** Estimated per-match API cost for one fighter — the test's margin basis. */
export function estimatedFighterCostUsd(modelId: string): number {
  const entry = getModelById(modelId);
  const providerId = entry?.providerId ?? "openrouter";
  const price = getModelPrice(providerId, modelId);
  const reasons =
    Boolean(entry?.reasoningEffort) ||
    OPENAI_REASONING.has(modelId) ||
    DEEPSEEK_REASONING.has(modelId);
  const outTokens = PROFILE.outTokens + (reasons ? PROFILE.thinkingTokens : 0);
  return (PROFILE.inTokens * price.inputCostPer1M + outTokens * price.outputCostPer1M) / 1e6;
}
