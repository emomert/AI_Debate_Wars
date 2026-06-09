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

import type { Locale } from "@/lib/i18n/config";
import type { ModelColor } from "@/lib/debate/debateTypes";

export type Backend = "openai" | "deepseek" | "openrouter";

export type CostTier = "free" | "low" | "medium" | "high";

export interface ModelCatalogEntry {
  id: string;
  providerId: Backend;
  /** Display group shown as a tab in the picker. */
  brand: string;
  /**
   * Model LINE within a brand (GPT-5.4, DeepSeek V4, …). The picker shows
   * families first; variants of a family live in a collapsible group.
   */
  family: string;
  displayName: string;
  nickname: string;
  color: ModelColor;
  costTier: CostTier;
  debateRating: number;
  avatar: string;
  supportsStreaming: boolean;
  /**
   * Whether the model writes fluent, reliable Turkish. Drives model hiding when
   * the UI is in Turkish (a quality bar for a Turkish-first product, not just
   * "can it emit any Turkish"). Paid OpenAI/DeepSeek all qualify; free models
   * were assessed against Turkish benchmarks (CETVEL/TurkishMMLU) + official
   * language lists — conservatively, only reliably-fluent families are `true`.
   */
  supportsTurkish: boolean;
  maxOutputTokens: number;
  /**
   * Caps the hidden thinking of reasoning models so turns arrive fast
   * (OpenRouter `reasoning.effort`). Verified against OpenRouter's live
   * `supported_parameters` — only set where the model accepts it.
   */
  reasoningEffort?: "low" | "medium";
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  // ── OpenAI (backend: openai) ─────────────────────────────────────────────
  // Verified against the live /v1/models list (June 2026): gpt-5.5, the
  // gpt-5.4 family and gpt-5.3-chat-latest are available alongside the rest.
  // All OpenAI models are fluent in Turkish → supportsTurkish: true.
  { id: "gpt-5.5", providerId: "openai", brand: "OpenAI", family: "GPT-5.5", displayName: "GPT-5.5", nickname: "The Champion", color: "blue", costTier: "high", debateRating: 97, avatar: "👑", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.4", providerId: "openai", brand: "OpenAI", family: "GPT-5.4", displayName: "GPT-5.4", nickname: "The Contender", color: "blue", costTier: "high", debateRating: 95, avatar: "🥇", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.4-mini", providerId: "openai", brand: "OpenAI", family: "GPT-5.4", displayName: "GPT-5.4 Mini", nickname: "The Quick Thinker", color: "blue", costTier: "medium", debateRating: 89, avatar: "⚡", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.4-nano", providerId: "openai", brand: "OpenAI", family: "GPT-5.4", displayName: "GPT-5.4 Nano", nickname: "The Sprinter", color: "blue", costTier: "low", debateRating: 82, avatar: "🐇", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.3-chat-latest", providerId: "openai", brand: "OpenAI", family: "GPT-5.3", displayName: "GPT-5.3", nickname: "The Smooth Talker", color: "blue", costTier: "high", debateRating: 94, avatar: "🎙️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.2-chat-latest", providerId: "openai", brand: "OpenAI", family: "GPT-5.2", displayName: "GPT-5.2", nickname: "The Veteran", color: "blue", costTier: "high", debateRating: 93, avatar: "🏆", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.1-chat-latest", providerId: "openai", brand: "OpenAI", family: "GPT-5.1", displayName: "GPT-5.1", nickname: "The Seasoned Pro", color: "blue", costTier: "high", debateRating: 92, avatar: "🥈", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5-mini", providerId: "openai", brand: "OpenAI", family: "GPT-5", displayName: "GPT-5 Mini", nickname: "The Reliable", color: "blue", costTier: "medium", debateRating: 87, avatar: "🔷", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5-nano", providerId: "openai", brand: "OpenAI", family: "GPT-5", displayName: "GPT-5 Nano", nickname: "The Pocket Rocket", color: "blue", costTier: "low", debateRating: 80, avatar: "🚀", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-4.1", providerId: "openai", brand: "OpenAI", family: "GPT-4.1", displayName: "GPT-4.1", nickname: "The Heavyweight", color: "blue", costTier: "high", debateRating: 90, avatar: "🧩", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },
  { id: "gpt-4.1-mini", providerId: "openai", brand: "OpenAI", family: "GPT-4.1", displayName: "GPT-4.1 Mini", nickname: "The Polished Strategist", color: "blue", costTier: "low", debateRating: 84, avatar: "🤖", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },
  { id: "gpt-4.1-nano", providerId: "openai", brand: "OpenAI", family: "GPT-4.1", displayName: "GPT-4.1 Nano", nickname: "The Featherweight", color: "blue", costTier: "low", debateRating: 74, avatar: "🪶", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },
  { id: "gpt-4o", providerId: "openai", brand: "OpenAI", family: "GPT-4o", displayName: "GPT-4o", nickname: "The All-Rounder", color: "blue", costTier: "medium", debateRating: 86, avatar: "🎛️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },
  { id: "gpt-4o-mini", providerId: "openai", brand: "OpenAI", family: "GPT-4o", displayName: "GPT-4o Mini", nickname: "The Quick Wit", color: "blue", costTier: "low", debateRating: 80, avatar: "💨", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },

  // ── DeepSeek (backend: deepseek) ─────────────────────────────────────────
  // Live /models list returns exactly these two (June 2026). Both fluent in Turkish.
  { id: "deepseek-v4-pro", providerId: "deepseek", brand: "DeepSeek", family: "DeepSeek V4", displayName: "DeepSeek V4 Pro", nickname: "The Tactician", color: "red", costTier: "medium", debateRating: 90, avatar: "🐉", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "deepseek-v4-flash", providerId: "deepseek", brand: "DeepSeek", family: "DeepSeek V4", displayName: "DeepSeek V4 Flash", nickname: "The Sharp Challenger", color: "red", costTier: "low", debateRating: 83, avatar: "⚔️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },

  // ── OpenRouter FREE models (backend: openrouter) — shown under their brand ─
  // Snapshot of OpenRouter's free tier; refresh by re-querying their /models API.
  // supportsTurkish set per Turkish-benchmark research (CETVEL/TurkishMMLU) +
  // official language lists: only reliably-fluent free families are `true`.
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", providerId: "openrouter", brand: "Qwen", family: "Qwen3", displayName: "Qwen3 Next 80B", nickname: "The Open Heavyweight", color: "purple", costTier: "free", debateRating: 86, avatar: "🦅", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "qwen/qwen3-coder:free", providerId: "openrouter", brand: "Qwen", family: "Qwen3", displayName: "Qwen3 Coder 480B", nickname: "The Builder", color: "purple", costTier: "free", debateRating: 80, avatar: "🦅", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", providerId: "openrouter", brand: "Llama", family: "Llama 3", displayName: "Llama 3.3 70B", nickname: "The Workhorse", color: "purple", costTier: "free", debateRating: 82, avatar: "🦙", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "meta-llama/llama-3.2-3b-instruct:free", providerId: "openrouter", brand: "Llama", family: "Llama 3", displayName: "Llama 3.2 3B", nickname: "The Lightweight", color: "purple", costTier: "free", debateRating: 64, avatar: "🦙", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192 },
  { id: "moonshotai/kimi-k2.6:free", providerId: "openrouter", brand: "Kimi", family: "Kimi K2", displayName: "Kimi K2.6", nickname: "The Long-Context Thinker", color: "purple", costTier: "free", debateRating: 85, avatar: "🌙", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "z-ai/glm-4.5-air:free", providerId: "openrouter", brand: "GLM", family: "GLM 4.5", displayName: "GLM 4.5 Air", nickname: "The Nimble Reasoner", color: "purple", costTier: "free", debateRating: 80, avatar: "🌀", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "google/gemma-4-31b-it:free", providerId: "openrouter", brand: "Gemma", family: "Gemma 4", displayName: "Gemma 4 31B", nickname: "The Scholar", color: "purple", costTier: "free", debateRating: 79, avatar: "💎", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "google/gemma-4-26b-a4b-it:free", providerId: "openrouter", brand: "Gemma", family: "Gemma 4", displayName: "Gemma 4 26B", nickname: "The Understudy", color: "purple", costTier: "free", debateRating: 77, avatar: "💎", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "openai/gpt-oss-120b:free", providerId: "openrouter", brand: "GPT-OSS", family: "GPT-OSS", displayName: "GPT-OSS 120B", nickname: "The Open Challenger", color: "purple", costTier: "free", debateRating: 84, avatar: "🧠", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "openai/gpt-oss-20b:free", providerId: "openrouter", brand: "GPT-OSS", family: "GPT-OSS", displayName: "GPT-OSS 20B", nickname: "The Open Sparring Partner", color: "purple", costTier: "free", debateRating: 76, avatar: "🧠", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", providerId: "openrouter", brand: "Hermes", family: "Hermes 3", displayName: "Hermes 3 405B", nickname: "The Colossus", color: "purple", costTier: "free", debateRating: 85, avatar: "🪽", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", providerId: "openrouter", brand: "Nemotron", family: "Nemotron 3", displayName: "Nemotron 3 Ultra 550B", nickname: "The Titan", color: "purple", costTier: "free", debateRating: 86, avatar: "🟩", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", providerId: "openrouter", brand: "Nemotron", family: "Nemotron 3", displayName: "Nemotron 3 Super 120B", nickname: "The Powerhouse", color: "purple", costTier: "free", debateRating: 83, avatar: "🟩", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", providerId: "openrouter", brand: "Nemotron", family: "Nemotron 3", displayName: "Nemotron 3 Nano 30B", nickname: "The Efficient", color: "purple", costTier: "free", debateRating: 77, avatar: "🟩", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", providerId: "openrouter", brand: "Nemotron", family: "Nemotron 3", displayName: "Nemotron 3 Nano Omni", nickname: "The Reasoner", color: "purple", costTier: "free", debateRating: 76, avatar: "🟩", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "nvidia/nemotron-nano-9b-v2:free", providerId: "openrouter", brand: "Nemotron", family: "Nemotron Nano", displayName: "Nemotron Nano 9B", nickname: "The Scout", color: "purple", costTier: "free", debateRating: 70, avatar: "🟩", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", providerId: "openrouter", brand: "Nemotron", family: "Nemotron Nano", displayName: "Nemotron Nano 12B VL", nickname: "The Observer", color: "purple", costTier: "free", debateRating: 70, avatar: "🟩", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", providerId: "openrouter", brand: "Dolphin", family: "Dolphin Mistral", displayName: "Dolphin Mistral 24B", nickname: "The Unfiltered", color: "purple", costTier: "free", debateRating: 72, avatar: "🐬", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192 },
  { id: "poolside/laguna-m.1:free", providerId: "openrouter", brand: "Poolside", family: "Laguna", displayName: "Laguna M.1", nickname: "The Newcomer", color: "purple", costTier: "free", debateRating: 70, avatar: "🏊", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "poolside/laguna-xs.2:free", providerId: "openrouter", brand: "Poolside", family: "Laguna", displayName: "Laguna XS.2", nickname: "The Minnow", color: "purple", costTier: "free", debateRating: 64, avatar: "🏊", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", providerId: "openrouter", brand: "Liquid", family: "LFM2.5", displayName: "LFM2.5 1.2B", nickname: "The Featherweight", color: "purple", costTier: "free", debateRating: 58, avatar: "💧", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192 },
  { id: "liquid/lfm-2.5-1.2b-thinking:free", providerId: "openrouter", brand: "Liquid", family: "LFM2.5", displayName: "LFM2.5 1.2B Thinking", nickname: "The Tiny Thinker", color: "purple", costTier: "free", debateRating: 60, avatar: "💧", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
];

export function getModelById(id: string): ModelCatalogEntry | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

/**
 * A short, curated "recommended fighters" set shown by default in each brand's
 * picker — the rest of that brand's models live behind a "Show all" expander so
 * the list isn't an overwhelming wall of models. Chosen to span the range (a
 * flagship, a fast mid-tier, a cheap option) per brand; for free brands it's the
 * standout model. Brands with only a couple of models show them all anyway.
 */
export const RECOMMENDED_MODEL_IDS: ReadonlySet<string> = new Set<string>([
  // OpenAI — flagship · fast mid · cheap
  "gpt-5.5",
  "gpt-5.4-mini",
  "gpt-4o-mini",
  // DeepSeek (only two — both)
  "deepseek-v4-pro",
  "deepseek-v4-flash",
  // Free brands — the standout per brand
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "moonshotai/kimi-k2.6:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-120b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "poolside/laguna-m.1:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
]);

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

/**
 * Whether a model is offerable in the given UI locale. Only Turkish gates: when
 * the site is in Turkish, models that don't write fluent Turkish are hidden
 * entirely (product decision — a Turkish-first experience). Every model is
 * allowed in English.
 */
export function modelSupportsLanguage(entry: ModelCatalogEntry, locale: Locale): boolean {
  return locale !== "tr" || entry.supportsTurkish;
}

/** Same, by model id — unknown ids are permissive so the engine never hard-fails. */
export function modelIdSupportsLanguage(modelId: string, locale: Locale): boolean {
  const entry = getModelById(modelId);
  return entry ? modelSupportsLanguage(entry, locale) : true;
}

/** Brands that still have at least one selectable model in the given locale. */
export function brandsForLocale(locale: Locale): BrandInfo[] {
  return BRANDS.filter((b) => modelsForBrand(b.brand, locale).length > 0);
}

export function modelsForBrand(
  brand: string,
  locale: Locale = "en",
): ModelCatalogEntry[] {
  return MODEL_CATALOG.filter(
    (m) => m.brand === brand && modelSupportsLanguage(m, locale),
  );
}

/** A model line within a brand (e.g. GPT-5.4 → flagship + mini + nano). */
export interface ModelFamily {
  family: string;
  /** Catalogue order, flagship (highest debateRating) first. */
  models: ModelCatalogEntry[];
}

/** Families of a brand in catalogue order; models sorted flagship-first. */
export function familiesForBrand(brand: string, locale: Locale = "en"): ModelFamily[] {
  const byFamily = new Map<string, ModelCatalogEntry[]>();
  for (const m of modelsForBrand(brand, locale)) {
    const list = byFamily.get(m.family);
    if (list) list.push(m);
    else byFamily.set(m.family, [m]);
  }
  return Array.from(byFamily, ([family, models]) => ({
    family,
    models: [...models].sort((a, b) => b.debateRating - a.debateRating),
  }));
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
  reasoningEffort?: "low" | "medium";
} {
  const entry = getModelById(modelId);
  return {
    providerId: entry?.providerId ?? fallbackProviderId,
    modelId,
    maxOutputTokens: entry?.maxOutputTokens ?? 4096,
    supportsStreaming: entry?.supportsStreaming ?? false,
    reasoningEffort: entry?.reasoningEffort,
  };
}

/**
 * How a Deep Debate turn gets its web results for this model:
 *  - "injected" — the app runs the search itself (search registry, e.g. Brave)
 *    and injects the numbered sources into the prompt.
 *  - "native"   — OpenRouter-backed only: the ":online" suffix makes OpenRouter
 *    run the search and return cited sources itself (~$0.005/turn).
 *
 * UNIFIED by default: every deep turn uses the app-run engine, so citations
 * look identical across brands and free fighters add no search fee. Set
 * DEEP_SEARCH_MODE=hybrid to route OpenRouter fighters natively instead —
 * a no-deploy escape hatch if the search quota runs dry. (Client bundles see
 * no env var → "unified", matching the server default.)
 */
export type DeepSearchStrategy = "native" | "injected";

export function deepSearchStrategy(modelId: string): DeepSearchStrategy {
  if (process.env.DEEP_SEARCH_MODE === "hybrid") {
    return getModelById(modelId)?.providerId === "openrouter" ? "native" : "injected";
  }
  return "injected";
}

/**
 * Whether a model can fight in Deep Debate. Native-search models always can;
 * injected models need the app's search engine to be configured — callers pass
 * that flag (client: from /api/health; server: from the search registry).
 */
export function modelSupportsWebSearch(
  modelId: string,
  injectedSearchReady = true,
): boolean {
  return deepSearchStrategy(modelId) === "native" || injectedSearchReady;
}

/**
 * Preferred neutral auto-judge ids per backend (cheap + capable), tried before
 * "any non-fighter model on that backend". SHARED by the server resolver
 * (providerRegistry.resolveAutoJudge) and the client preview (previewAutoJudge)
 * so both pick the same judge.
 */
export const PREFERRED_JUDGE_IDS: Record<Backend, string[]> = {
  openai: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4.1"],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  openrouter: [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ],
};

/**
 * Client-safe PREVIEW of the neutral "auto" judge. Mirrors `resolveAutoJudge`'s
 * selection (key-preference order → first preferred non-fighter → first other
 * non-fighter on that backend) but takes availability as plain data instead of
 * reading process.env, so the Setup UI can show which model will judge. Returns
 * null when availability is unknown or nothing neutral resolves — the caller
 * then shows a generic "picked automatically" note.
 */
export function previewAutoJudge(
  available: { openai: boolean; deepseek: boolean; openrouter: boolean } | null,
  fighterIds: string[],
): ModelCatalogEntry | null {
  if (!available) return null;
  const fighters = new Set(fighterIds.filter(Boolean));
  const order: Backend[] = [];
  if (available.openai) order.push("openai");
  if (available.deepseek) order.push("deepseek");
  if (available.openrouter) order.push("openrouter");

  for (const backend of order) {
    for (const id of PREFERRED_JUDGE_IDS[backend]) {
      if (!fighters.has(id)) {
        const entry = getModelById(id);
        if (entry) return entry;
      }
    }
    const neutral = MODEL_CATALOG.find(
      (m) => m.providerId === backend && !fighters.has(m.id),
    );
    if (neutral) return neutral;
  }

  // Degenerate: every candidate on every available backend is a fighter. Mirror
  // the server (resolveAutoJudge), which still appoints a fighter so the verdict
  // runs — the caller is expected to flag the pick as non-neutral.
  if (order.length > 0) {
    return getModelById(PREFERRED_JUDGE_IDS[order[0]][0]) ?? null;
  }
  return null;
}

export const COST_TIER_LABEL: Record<CostTier, string> = {
  free: "FREE",
  low: "$",
  medium: "$$",
  high: "$$$",
};
