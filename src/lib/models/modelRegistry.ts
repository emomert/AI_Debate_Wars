/**
 * Model registry — display catalogue of selectable "fighters".
 *
 * Two separate ideas:
 *  - `providerId` = the BACKEND that actually runs the call (openai / deepseek /
 *    openrouter). The UI never shows this directly.
 *  - `brand`     = how the model is grouped/labelled for the user (OpenAI,
 *    DeepSeek, Claude, Grok, Gemini, …). OpenRouter models appear under their
 *    real brand, not as "OpenRouter".
 *
 * Pricing lives separately in `src/lib/cost/pricing.ts`. `debateRating` is a
 * 0–100 suitability-for-debate score (used for sorting/judge choice — no longer
 * shown in the picker).
 *
 * PAID CATALOG (July 2026): the OpenRouter free tier was dropped when the
 * product moved to a paid OpenRouter account — every model below bills real
 * usage. Per owner rule, "fast"/accelerated twins of a model (e.g.
 * `claude-opus-4.8-fast`) are NOT added when the standard variant exists.
 */

import type { Locale } from "@/lib/i18n/config";
import type { ModelColor } from "@/lib/debate/debateTypes";

export type Backend = "openai" | "deepseek" | "openrouter";

export type CostTier = "low" | "medium" | "high";

export interface ModelCatalogEntry {
  id: string;
  providerId: Backend;
  /** Display group shown as a tab in the picker. */
  brand: string;
  /**
   * Model LINE within a brand (GPT-5.6, Opus, …). The picker shows
   * families first; variants of a family live in a collapsible group.
   */
  family: string;
  displayName: string;
  /** Legacy flavor text — no longer displayed anywhere (July 2026 declutter). */
  nickname?: string;
  color: ModelColor;
  costTier: CostTier;
  debateRating: number;
  avatar: string;
  supportsStreaming: boolean;
  /**
   * Whether the model writes fluent, reliable Turkish. Drives model hiding when
   * the UI is in Turkish (a quality bar for a Turkish-first product, not just
   * "can it emit any Turkish"). Frontier OpenAI/DeepSeek/Anthropic/Google/xAI/
   * Qwen models qualify; conservatively `false` for families without verified
   * Turkish fluency.
   */
  supportsTurkish: boolean;
  maxOutputTokens: number;
  /**
   * Caps the hidden thinking of reasoning models so turns arrive fast
   * (OpenRouter `reasoning.effort`). Verified against OpenRouter's live
   * `supported_parameters` (July 2026 snapshot) — only set where the model
   * accepts it.
   */
  reasoningEffort?: "low" | "medium";
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  // ── OpenAI (backend: openai) ─────────────────────────────────────────────
  // Verified against the live docs (July 2026): the GPT-5.6 family (Sol /
  // Terra / Luna, shipped 2026-07-09), GPT-5.5 and the GPT-5.4 family are
  // current. Only gpt-5.1-chat-latest was removed (OpenAI shuts it down
  // 2026-07-23). Later sunsets stay selectable until their date — REMOVE
  // gpt-5.2/5.3-chat-latest by Aug 10, gpt-4.1-nano by Oct 23, and
  // gpt-5-mini/nano by Dec 11, 2026 (developers.openai.com/api/docs/deprecations).
  // All OpenAI models are fluent in Turkish → supportsTurkish: true.
  { id: "gpt-5.6-sol", providerId: "openai", brand: "OpenAI", family: "GPT-5.6", displayName: "GPT-5.6 Sol", color: "blue", costTier: "high", debateRating: 98, avatar: "👑", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.6-terra", providerId: "openai", brand: "OpenAI", family: "GPT-5.6", displayName: "GPT-5.6 Terra", color: "blue", costTier: "high", debateRating: 96, avatar: "🥇", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.6-luna", providerId: "openai", brand: "OpenAI", family: "GPT-5.6", displayName: "GPT-5.6 Luna", color: "blue", costTier: "medium", debateRating: 92, avatar: "🌜", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.5", providerId: "openai", brand: "OpenAI", family: "GPT-5.5", displayName: "GPT-5.5", color: "blue", costTier: "high", debateRating: 97, avatar: "🏆", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.4", providerId: "openai", brand: "OpenAI", family: "GPT-5.4", displayName: "GPT-5.4", color: "blue", costTier: "high", debateRating: 95, avatar: "🎙️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.4-mini", providerId: "openai", brand: "OpenAI", family: "GPT-5.4", displayName: "GPT-5.4 Mini", color: "blue", costTier: "medium", debateRating: 89, avatar: "⚡", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.4-nano", providerId: "openai", brand: "OpenAI", family: "GPT-5.4", displayName: "GPT-5.4 Nano", color: "blue", costTier: "low", debateRating: 82, avatar: "🐇", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  // Sunset 2026-08-10 (→ gpt-5.5):
  { id: "gpt-5.3-chat-latest", providerId: "openai", brand: "OpenAI", family: "GPT-5.3", displayName: "GPT-5.3", color: "blue", costTier: "high", debateRating: 94, avatar: "🎤", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5.2-chat-latest", providerId: "openai", brand: "OpenAI", family: "GPT-5.2", displayName: "GPT-5.2", color: "blue", costTier: "high", debateRating: 93, avatar: "🏅", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  // Sunset 2026-12-11 (→ gpt-5.4-mini / gpt-5.4-nano):
  { id: "gpt-5-mini", providerId: "openai", brand: "OpenAI", family: "GPT-5", displayName: "GPT-5 Mini", color: "blue", costTier: "medium", debateRating: 87, avatar: "🔷", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-5-nano", providerId: "openai", brand: "OpenAI", family: "GPT-5", displayName: "GPT-5 Nano", color: "blue", costTier: "low", debateRating: 80, avatar: "🚀", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "gpt-4.1", providerId: "openai", brand: "OpenAI", family: "GPT-4.1", displayName: "GPT-4.1", color: "blue", costTier: "high", debateRating: 90, avatar: "🧩", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },
  { id: "gpt-4.1-mini", providerId: "openai", brand: "OpenAI", family: "GPT-4.1", displayName: "GPT-4.1 Mini", color: "blue", costTier: "low", debateRating: 84, avatar: "🤖", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },
  // Sunset 2026-10-23 (→ gpt-5.4-nano):
  { id: "gpt-4.1-nano", providerId: "openai", brand: "OpenAI", family: "GPT-4.1", displayName: "GPT-4.1 Nano", color: "blue", costTier: "low", debateRating: 74, avatar: "🪶", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },
  { id: "gpt-4o", providerId: "openai", brand: "OpenAI", family: "GPT-4o", displayName: "GPT-4o", color: "blue", costTier: "medium", debateRating: 86, avatar: "🎛️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },
  { id: "gpt-4o-mini", providerId: "openai", brand: "OpenAI", family: "GPT-4o", displayName: "GPT-4o Mini", color: "blue", costTier: "low", debateRating: 80, avatar: "💨", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 4096 },

  // ── DeepSeek (backend: deepseek) ─────────────────────────────────────────
  // Live /models list returns exactly these two (June 2026). Both fluent in Turkish.
  { id: "deepseek-v4-pro", providerId: "deepseek", brand: "DeepSeek", family: "DeepSeek V4", displayName: "DeepSeek V4 Pro", color: "red", costTier: "medium", debateRating: 90, avatar: "🐉", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },
  { id: "deepseek-v4-flash", providerId: "deepseek", brand: "DeepSeek", family: "DeepSeek V4", displayName: "DeepSeek V4 Flash", color: "red", costTier: "low", debateRating: 83, avatar: "⚔️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192 },

  // ── OpenRouter PAID models (backend: openrouter) — shown under their brand ─
  // Snapshot of OpenRouter's /api/v1/models (2026-07-11); ids, pricing and
  // `reasoning` support verified against the live list. Refresh by re-querying.

  // xAI — Grok
  { id: "x-ai/grok-4.5", providerId: "openrouter", brand: "Grok", family: "Grok 4.5", displayName: "Grok 4.5", color: "purple", costTier: "medium", debateRating: 95, avatar: "🪐", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "x-ai/grok-4.3", providerId: "openrouter", brand: "Grok", family: "Grok 4.3", displayName: "Grok 4.3", color: "purple", costTier: "medium", debateRating: 92, avatar: "🪐", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  // NOTE: xAI's public lineup jumps 4.3 → 4.20 ("4.2" doesn't exist).
  { id: "x-ai/grok-4.20", providerId: "openrouter", brand: "Grok", family: "Grok 4.20", displayName: "Grok 4.20", color: "purple", costTier: "medium", debateRating: 90, avatar: "🪐", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },

  // Anthropic — Claude
  { id: "anthropic/claude-fable-5", providerId: "openrouter", brand: "Claude", family: "Fable", displayName: "Fable 5", color: "purple", costTier: "high", debateRating: 98, avatar: "✳️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "anthropic/claude-opus-4.8", providerId: "openrouter", brand: "Claude", family: "Opus", displayName: "Opus 4.8", color: "purple", costTier: "high", debateRating: 96, avatar: "✳️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "anthropic/claude-opus-4.7", providerId: "openrouter", brand: "Claude", family: "Opus", displayName: "Opus 4.7", color: "purple", costTier: "high", debateRating: 95, avatar: "✳️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "anthropic/claude-sonnet-5", providerId: "openrouter", brand: "Claude", family: "Sonnet", displayName: "Sonnet 5", color: "purple", costTier: "medium", debateRating: 94, avatar: "✳️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "anthropic/claude-opus-4.6", providerId: "openrouter", brand: "Claude", family: "Opus", displayName: "Opus 4.6", color: "purple", costTier: "high", debateRating: 93, avatar: "✳️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "anthropic/claude-sonnet-4.6", providerId: "openrouter", brand: "Claude", family: "Sonnet", displayName: "Sonnet 4.6", color: "purple", costTier: "high", debateRating: 91, avatar: "✳️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "anthropic/claude-opus-4.5", providerId: "openrouter", brand: "Claude", family: "Opus", displayName: "Opus 4.5", color: "purple", costTier: "high", debateRating: 90, avatar: "✳️", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },

  // Google — Gemini
  { id: "google/gemini-3.5-flash", providerId: "openrouter", brand: "Gemini", family: "Gemini 3.5", displayName: "Gemini 3.5 Flash", color: "purple", costTier: "medium", debateRating: 92, avatar: "💠", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "google/gemini-3.1-flash-lite", providerId: "openrouter", brand: "Gemini", family: "Gemini 3.1", displayName: "Gemini 3.1 Flash Lite", color: "purple", costTier: "low", debateRating: 84, avatar: "💠", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "google/gemini-2.5-pro", providerId: "openrouter", brand: "Gemini", family: "Gemini 2.5", displayName: "Gemini 2.5 Pro", color: "purple", costTier: "medium", debateRating: 90, avatar: "💠", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "google/gemini-2.5-flash", providerId: "openrouter", brand: "Gemini", family: "Gemini 2.5", displayName: "Gemini 2.5 Flash", color: "purple", costTier: "low", debateRating: 85, avatar: "💠", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },

  // Xiaomi — MiMo
  { id: "xiaomi/mimo-v2.5-pro", providerId: "openrouter", brand: "Xiaomi", family: "MiMo V2.5", displayName: "MiMo V2.5 Pro", color: "purple", costTier: "low", debateRating: 86, avatar: "🟠", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "xiaomi/mimo-v2.5", providerId: "openrouter", brand: "Xiaomi", family: "MiMo V2.5", displayName: "MiMo V2.5", color: "purple", costTier: "low", debateRating: 81, avatar: "🟠", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },

  // Z.AI — GLM
  { id: "z-ai/glm-5.2", providerId: "openrouter", brand: "GLM", family: "GLM 5", displayName: "GLM 5.2", color: "purple", costTier: "low", debateRating: 88, avatar: "🌀", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "z-ai/glm-5", providerId: "openrouter", brand: "GLM", family: "GLM 5", displayName: "GLM 5", color: "purple", costTier: "low", debateRating: 85, avatar: "🌀", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },

  // Moonshot — Kimi
  { id: "moonshotai/kimi-k2.6", providerId: "openrouter", brand: "Kimi", family: "Kimi K2", displayName: "Kimi K2.6", color: "purple", costTier: "medium", debateRating: 88, avatar: "🌙", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "moonshotai/kimi-k2.7-code", providerId: "openrouter", brand: "Kimi", family: "Kimi K2", displayName: "Kimi K2.7 Code", color: "purple", costTier: "medium", debateRating: 84, avatar: "🌙", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },

  // NVIDIA — Nemotron
  { id: "nvidia/nemotron-3-ultra-550b-a55b", providerId: "openrouter", brand: "Nemotron", family: "Nemotron 3", displayName: "Nemotron 3 Ultra", color: "purple", costTier: "medium", debateRating: 86, avatar: "🟩", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "nvidia/nemotron-3-super-120b-a12b", providerId: "openrouter", brand: "Nemotron", family: "Nemotron 3", displayName: "Nemotron 3 Super", color: "purple", costTier: "low", debateRating: 83, avatar: "🟩", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },

  // Alibaba — Qwen
  { id: "qwen/qwen3.7-max", providerId: "openrouter", brand: "Qwen", family: "Qwen3.7", displayName: "Qwen3.7 Max", color: "purple", costTier: "medium", debateRating: 91, avatar: "🦅", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "qwen/qwen3.7-plus", providerId: "openrouter", brand: "Qwen", family: "Qwen3.7", displayName: "Qwen3.7 Plus", color: "purple", costTier: "low", debateRating: 87, avatar: "🦅", supportsStreaming: true, supportsTurkish: true, maxOutputTokens: 8192, reasoningEffort: "low" },

  // MiniMax
  { id: "minimax/minimax-m3", providerId: "openrouter", brand: "MiniMax", family: "MiniMax M3", displayName: "MiniMax M3", color: "purple", costTier: "low", debateRating: 87, avatar: "🧿", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
  { id: "minimax/minimax-m2.7", providerId: "openrouter", brand: "MiniMax", family: "MiniMax M2", displayName: "MiniMax M2.7", color: "purple", costTier: "low", debateRating: 84, avatar: "🧿", supportsStreaming: true, supportsTurkish: false, maxOutputTokens: 8192, reasoningEffort: "low" },
];

export function getModelById(id: string): ModelCatalogEntry | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

/**
 * A short, curated "recommended fighters" set shown by default in each brand's
 * picker — the rest of that brand's models live behind a "Show all" expander so
 * the list isn't an overwhelming wall of models. Chosen to span the range (a
 * flagship, a fast mid-tier, a cheap option) per brand. Brands with only a
 * couple of models show them all anyway.
 */
export const RECOMMENDED_MODEL_IDS: ReadonlySet<string> = new Set<string>([
  // OpenAI — flagship · fast mid · mini
  "gpt-5.6-sol",
  "gpt-5.6-luna",
  "gpt-5.4-mini",
  // DeepSeek (only two — both)
  "deepseek-v4-pro",
  "deepseek-v4-flash",
  // OpenRouter brands — the standout(s) per brand
  "x-ai/grok-4.5",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-opus-4.8",
  "google/gemini-3.5-flash",
  "google/gemini-2.5-pro",
  "xiaomi/mimo-v2.5-pro",
  "z-ai/glm-5.2",
  "moonshotai/kimi-k2.6",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "qwen/qwen3.7-max",
  "minimax/minimax-m3",
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

/** A model line within a brand (e.g. GPT-5.6 → Sol + Terra + Luna). */
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
 * look identical across brands. Set DEEP_SEARCH_MODE=hybrid to route OpenRouter
 * fighters natively instead — a no-deploy escape hatch if the search quota runs
 * dry. (Client bundles see no env var → "unified", matching the server default.)
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
    "google/gemini-3.1-flash-lite",
    "xiaomi/mimo-v2.5",
    "z-ai/glm-5.2",
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

/** Relative price tier shown on the picker rows. */
export const COST_TIER_LABEL: Record<CostTier, string> = {
  low: "$",
  medium: "$$",
  high: "$$$",
};
