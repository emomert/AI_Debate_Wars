/**
 * Brave Web Search implementation of `SearchProvider`.
 *
 * Free plan: 2,000 queries/month at 1 req/s — enough for ~140 deep debates at
 * zero cost. Upgrading to a paid Brave tier for heavier demand needs no code
 * change: same endpoint and key, just set SEARCH_COST_USD if the tier bills
 * per query so the cost HUD stays honest.
 *
 * The key is read from BRAVE_SEARCH_API_KEY at call time, server-side only —
 * it never reaches the client (same rule as the model-provider keys).
 */

import type { Citation } from "@/lib/debate/debateTypes";
import type { SearchOptions, SearchProvider } from "@/lib/search/types";
import { ProviderError } from "@/lib/utils/errors";

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_COUNT = 5;
const DEFAULT_TIMEOUT_MS = 10_000;
// Mirror parseCitations' cap so injected and native sources render alike.
const MAX_QUOTE_LENGTH = 500;

/** Brave caps `q` at 400 chars / 50 words; clamp the topic to fit. */
function toSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").split(" ").slice(0, 50).join(" ").slice(0, 400);
}

/** Strip the HTML decoration Brave puts in snippets (<strong>…</strong>, entities). */
function cleanSnippet(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x?27;|&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    // &amp; LAST, so double-escaped text ("&amp;lt;") decodes once, not twice.
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

function mapResults(results: BraveWebResult[], count: number): Citation[] {
  const citations: Citation[] = [];
  for (const r of results) {
    if (citations.length >= count) break;
    const title = cleanSnippet(r.title);
    const url = typeof r.url === "string" ? r.url : "";
    if (!title || !/^https?:\/\//.test(url)) continue;
    const quote = cleanSnippet(r.description).slice(0, MAX_QUOTE_LENGTH);
    citations.push({
      index: citations.length + 1,
      title,
      url,
      quote: quote || undefined,
    });
  }
  return citations;
}

export const braveSearchProvider: SearchProvider = {
  id: "brave",

  isConfigured(): boolean {
    return Boolean(process.env.BRAVE_SEARCH_API_KEY);
  },

  async search(query: string, opts: SearchOptions = {}): Promise<Citation[]> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      throw new ProviderError(
        "MISSING_API_KEY",
        "Web search needs BRAVE_SEARCH_API_KEY on the server",
      );
    }

    const count = Math.min(Math.max(opts.count ?? DEFAULT_COUNT, 1), 10);
    const params = new URLSearchParams({
      q: toSearchQuery(query),
      count: String(count),
      // Plain-text snippets (no <strong> highlight markup to strip later).
      text_decorations: "0",
    });

    // Combine the per-call timeout with the caller's signal (Stop/navigation).
    // An already-aborted signal never fires "abort", so check it explicitly —
    // otherwise a turn nobody waits for still burns a metered search query.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const onCallerAbort = () => controller.abort();
    if (opts.signal?.aborted) controller.abort();
    else opts.signal?.addEventListener("abort", onCallerAbort, { once: true });

    try {
      const res = await fetch(`${BRAVE_ENDPOINT}?${params}`, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new ProviderError(
            "RATE_LIMITED",
            "Web search is rate-limited — wait a moment and retry",
          );
        }
        if (res.status === 401 || res.status === 403) {
          // MISSING_API_KEY (like the model providers map 401/403) so the
          // client fails fast with key copy instead of silently retrying a
          // deterministic failure 4 times.
          throw new ProviderError(
            "MISSING_API_KEY",
            "The web-search API key was rejected",
          );
        }
        throw new ProviderError("PROVIDER_ERROR", `Web search failed (${res.status})`);
      }

      const data = (await res.json()) as { web?: { results?: BraveWebResult[] } };
      return mapResults(data.web?.results ?? [], count);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ProviderError("PROVIDER_TIMEOUT", "Web search timed out");
      }
      throw new ProviderError("PROVIDER_ERROR", "Web search failed");
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onCallerAbort);
    }
  },
};
