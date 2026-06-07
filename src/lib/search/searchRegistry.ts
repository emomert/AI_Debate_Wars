/**
 * Search registry — picks the active web-search engine for Deep Debate's
 * "injected" path (the default for ALL fighters; see deepSearchStrategy).
 *
 * Configured by env so scaling up later is a dashboard change, not a deploy:
 *  - SEARCH_PROVIDER  — engine id (default "brave"; add engines in PROVIDERS).
 *  - SEARCH_COST_USD  — per-query fee surfaced in the cost HUD (default 0;
 *                       set it when moving off a free search tier).
 *  - DEEP_SEARCH_MODE — "unified" (default) or "hybrid" (OpenRouter fighters
 *                       search natively via ":online"); read in modelRegistry.
 */

import { braveSearchProvider } from "@/lib/search/braveSearch";
import type { SearchProvider } from "@/lib/search/types";

const SEARCH_PROVIDERS: Record<string, SearchProvider> = {
  brave: braveSearchProvider,
};

export function getSearchProvider(): SearchProvider {
  const id = (process.env.SEARCH_PROVIDER ?? "brave").trim().toLowerCase();
  return SEARCH_PROVIDERS[id] ?? braveSearchProvider;
}

/** True when the active engine has its server-side credentials. */
export function isInjectedSearchConfigured(): boolean {
  return getSearchProvider().isConfigured();
}

/** Per-search fee for injected searches ($0 on Brave's free tier). */
export function injectedSearchCostUsd(): number {
  const raw = Number(process.env.SEARCH_COST_USD);
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}
