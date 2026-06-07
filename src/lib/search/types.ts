/**
 * Web-search abstraction for Deep Debate (mirrors the model-provider layer).
 *
 * The debate engine only ever talks to `SearchProvider` — never to a specific
 * search vendor. Swapping Brave for another engine (or a paid tier) means one
 * new implementation + a registry entry, with zero changes to routes or UI.
 */

import type { Citation } from "@/lib/debate/debateTypes";

export interface SearchOptions {
  /** How many sources to return (provider may cap it). */
  count?: number;
  /** Per-call timeout in ms. */
  timeoutMs?: number;
  /** Caller cancellation (e.g. the user pressed Stop). */
  signal?: AbortSignal;
}

export interface SearchProvider {
  id: string;
  /** True when the server has the credentials this engine needs. */
  isConfigured(): boolean;
  /**
   * Run ONE web search and return normalized sources, numbered 1..n — the same
   * `Citation` shape OpenRouter's native search produces, so everything
   * downstream (prompt block, [n] chips, SourcesList) works identically.
   */
  search(query: string, opts?: SearchOptions): Promise<Citation[]>;
}
