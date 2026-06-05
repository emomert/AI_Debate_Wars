/**
 * Model registry — display catalogue of selectable "fighters".
 *
 * Two separate ideas:
 *  - `providerId` = the BACKEND that actually runs the call (openai / deepseek /
 *    openrouter). The UI never shows this directly.
 *  - `brand`     = how the model is grouped/labelled for the user (OpenAI,
 *    DeepSeek, Qwen, Llama, …). OpenRouter models appear under their real brand,
 *    not as "OpenRouter".
 *
 * Pricing lives separately in `src/lib/cost/pricing.ts`. `debateRating` is a
 * 0–100 suitability-for-debate score shown in the picker.
 */

import type { ModelColor } from "@/lib/debate/debateTypes";

export type Backend = "openai" | "deepseek" | "openrouter";

export type CostTier = "free" | "low" | "medium" | "high";

export interface ModelCatalogEntry {
  id: string;
  providerId: Backend;
  /** Display group shown as a tab in the picker. */
  brand: string;
  displayName: string;
  nickname: string;
  color: ModelColor;
  costTier: CostTier;
  debateRating: number;
  avatar: string;
  supportsStreaming: boolean;
  maxOutputTokens: number;
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  // ── OpenAI (backend: openai) ─────────────────────────────────────────────
  { id: "gpt-5.2-chat-latest", providerId: "openai", brand: "OpenAI", displayName: "GPT-5.2", nickname: "The Champion", color: "blue", costTier: "high", debateRating: 96, avatar: "👑", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "gpt-5.1-chat-latest", providerId: "openai", brand: "OpenAI", displayName: "GPT-5.1", nickname: "The Contender", color: "blue", costTier: "high", debateRating: 94, avatar: "🥇", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "gpt-5-mini", providerId: "openai", brand: "OpenAI", displayName: "GPT-5 Mini", nickname: "The Quick Thinker", color: "blue", costTier: "medium", debateRating: 88, avatar: "⚡", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "gpt-5-nano", providerId: "openai", brand: "OpenAI", displayName: "GPT-5 Nano", nickname: "The Sprinter", color: "blue", costTier: "low", debateRating: 80, avatar: "🐇", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "gpt-4.1", providerId: "openai", brand: "OpenAI", displayName: "GPT-4.1", nickname: "The Heavyweight", color: "blue", costTier: "high", debateRating: 90, avatar: "🧩", supportsStreaming: true, maxOutputTokens: 4096 },
  { id: "gpt-4.1-mini", providerId: "openai", brand: "OpenAI", displayName: "GPT-4.1 Mini", nickname: "The Polished Strategist", color: "blue", costTier: "low", debateRating: 84, avatar: "🤖", supportsStreaming: true, maxOutputTokens: 4096 },
  { id: "gpt-4.1-nano", providerId: "openai", brand: "OpenAI", displayName: "GPT-4.1 Nano", nickname: "The Featherweight", color: "blue", costTier: "low", debateRating: 74, avatar: "🪶", supportsStreaming: true, maxOutputTokens: 4096 },
  { id: "gpt-4o", providerId: "openai", brand: "OpenAI", displayName: "GPT-4o", nickname: "The All-Rounder", color: "blue", costTier: "medium", debateRating: 86, avatar: "🎛️", supportsStreaming: true, maxOutputTokens: 4096 },
  { id: "gpt-4o-mini", providerId: "openai", brand: "OpenAI", displayName: "GPT-4o Mini", nickname: "The Quick Wit", color: "blue", costTier: "low", debateRating: 80, avatar: "💨", supportsStreaming: true, maxOutputTokens: 4096 },

  // ── DeepSeek (backend: deepseek) ─────────────────────────────────────────
  { id: "deepseek-v4-pro", providerId: "deepseek", brand: "DeepSeek", displayName: "DeepSeek V4 Pro", nickname: "The Tactician", color: "red", costTier: "medium", debateRating: 90, avatar: "🐉", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "deepseek-v4-flash", providerId: "deepseek", brand: "DeepSeek", displayName: "DeepSeek V4 Flash", nickname: "The Sharp Challenger", color: "red", costTier: "low", debateRating: 83, avatar: "⚔️", supportsStreaming: true, maxOutputTokens: 8192 },

  // ── OpenRouter FREE models (backend: openrouter) — shown under their brand ─
  // Snapshot of OpenRouter's free tier; refresh by re-querying their /models API.
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", providerId: "openrouter", brand: "Qwen", displayName: "Qwen3 Next 80B", nickname: "The Open Heavyweight", color: "purple", costTier: "free", debateRating: 86, avatar: "🦅", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "qwen/qwen3-coder:free", providerId: "openrouter", brand: "Qwen", displayName: "Qwen3 Coder 480B", nickname: "The Builder", color: "purple", costTier: "free", debateRating: 80, avatar: "🦅", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", providerId: "openrouter", brand: "Llama", displayName: "Llama 3.3 70B", nickname: "The Workhorse", color: "purple", costTier: "free", debateRating: 82, avatar: "🦙", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "meta-llama/llama-3.2-3b-instruct:free", providerId: "openrouter", brand: "Llama", displayName: "Llama 3.2 3B", nickname: "The Lightweight", color: "purple", costTier: "free", debateRating: 64, avatar: "🦙", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "moonshotai/kimi-k2.6:free", providerId: "openrouter", brand: "Kimi", displayName: "Kimi K2.6", nickname: "The Long-Context Thinker", color: "purple", costTier: "free", debateRating: 85, avatar: "🌙", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "z-ai/glm-4.5-air:free", providerId: "openrouter", brand: "GLM", displayName: "GLM 4.5 Air", nickname: "The Nimble Reasoner", color: "purple", costTier: "free", debateRating: 80, avatar: "🌀", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "google/gemma-4-31b-it:free", providerId: "openrouter", brand: "Gemma", displayName: "Gemma 4 31B", nickname: "The Scholar", color: "purple", costTier: "free", debateRating: 79, avatar: "💎", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "google/gemma-4-26b-a4b-it:free", providerId: "openrouter", brand: "Gemma", displayName: "Gemma 4 26B", nickname: "The Understudy", color: "purple", costTier: "free", debateRating: 77, avatar: "💎", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "openai/gpt-oss-120b:free", providerId: "openrouter", brand: "GPT-OSS", displayName: "GPT-OSS 120B", nickname: "The Open Challenger", color: "purple", costTier: "free", debateRating: 84, avatar: "🧠", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "openai/gpt-oss-20b:free", providerId: "openrouter", brand: "GPT-OSS", displayName: "GPT-OSS 20B", nickname: "The Open Sparring Partner", color: "purple", costTier: "free", debateRating: 76, avatar: "🧠", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", providerId: "openrouter", brand: "Hermes", displayName: "Hermes 3 405B", nickname: "The Colossus", color: "purple", costTier: "free", debateRating: 85, avatar: "🪽", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", providerId: "openrouter", brand: "Nemotron", displayName: "Nemotron 3 Ultra 550B", nickname: "The Titan", color: "purple", costTier: "free", debateRating: 86, avatar: "🟩", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", providerId: "openrouter", brand: "Nemotron", displayName: "Nemotron 3 Super 120B", nickname: "The Powerhouse", color: "purple", costTier: "free", debateRating: 83, avatar: "🟩", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", providerId: "openrouter", brand: "Nemotron", displayName: "Nemotron 3 Nano 30B", nickname: "The Efficient", color: "purple", costTier: "free", debateRating: 77, avatar: "🟩", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", providerId: "openrouter", brand: "Nemotron", displayName: "Nemotron 3 Nano Omni", nickname: "The Reasoner", color: "purple", costTier: "free", debateRating: 76, avatar: "🟩", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "nvidia/nemotron-nano-9b-v2:free", providerId: "openrouter", brand: "Nemotron", displayName: "Nemotron Nano 9B", nickname: "The Scout", color: "purple", costTier: "free", debateRating: 70, avatar: "🟩", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", providerId: "openrouter", brand: "Nemotron", displayName: "Nemotron Nano 12B VL", nickname: "The Observer", color: "purple", costTier: "free", debateRating: 70, avatar: "🟩", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", providerId: "openrouter", brand: "Dolphin", displayName: "Dolphin Mistral 24B", nickname: "The Unfiltered", color: "purple", costTier: "free", debateRating: 72, avatar: "🐬", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "poolside/laguna-m.1:free", providerId: "openrouter", brand: "Poolside", displayName: "Laguna M.1", nickname: "The Newcomer", color: "purple", costTier: "free", debateRating: 70, avatar: "🏊", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "poolside/laguna-xs.2:free", providerId: "openrouter", brand: "Poolside", displayName: "Laguna XS.2", nickname: "The Minnow", color: "purple", costTier: "free", debateRating: 64, avatar: "🏊", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", providerId: "openrouter", brand: "Liquid", displayName: "LFM2.5 1.2B", nickname: "The Featherweight", color: "purple", costTier: "free", debateRating: 58, avatar: "💧", supportsStreaming: true, maxOutputTokens: 8192 },
  { id: "liquid/lfm-2.5-1.2b-thinking:free", providerId: "openrouter", brand: "Liquid", displayName: "LFM2.5 1.2B Thinking", nickname: "The Tiny Thinker", color: "purple", costTier: "free", debateRating: 60, avatar: "💧", supportsStreaming: true, maxOutputTokens: 8192 },
];

export function getModelById(id: string): ModelCatalogEntry | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

/** A selectable brand tab + the backend that runs its models. */
export interface BrandInfo {
  brand: string;
  backend: Backend;
}

/** Distinct brands in catalogue order, each mapped to its backend. */
export const BRANDS: BrandInfo[] = (() => {
  const seen = new Map<string, Backend>();
  for (const m of MODEL_CATALOG) {
    if (!seen.has(m.brand)) seen.set(m.brand, m.providerId);
  }
  return Array.from(seen, ([brand, backend]) => ({ brand, backend }));
})();

export function modelsForBrand(brand: string): ModelCatalogEntry[] {
  return MODEL_CATALOG.filter((m) => m.brand === brand);
}

/**
 * Resolve a provider call config for a model id. Falls back to safe defaults for
 * ids not in the catalogue (so the engine never crashes on an unknown model).
 */
export function getProviderModelConfig(
  modelId: string,
  fallbackProviderId: Backend = "openai",
): {
  providerId: Backend;
  modelId: string;
  maxOutputTokens: number;
  supportsStreaming: boolean;
} {
  const entry = getModelById(modelId);
  return {
    providerId: entry?.providerId ?? fallbackProviderId,
    modelId,
    maxOutputTokens: entry?.maxOutputTokens ?? 4096,
    supportsStreaming: entry?.supportsStreaming ?? false,
  };
}

export const COST_TIER_LABEL: Record<CostTier, string> = {
  free: "FREE",
  low: "$",
  medium: "$$",
  high: "$$$",
};
