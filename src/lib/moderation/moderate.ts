/**
 * Content moderation via OpenAI's free `omni-moderation-latest` endpoint.
 *
 * Gates user-supplied text BEFORE it reaches a paid provider (debate topics) or a
 * permanent public surface (published transcripts). An ungated topic flows
 * verbatim to OpenAI/DeepSeek/OpenRouter/Brave — an abuse vector AND a
 * provider-account-standing (TOS) risk: a banned key kills the whole app.
 * Moderation is free (reuses OPENAI_API_KEY), so this costs nothing to run.
 *
 * FAIL-OPEN by design (mirrors rateLimit.ts): if the endpoint is unconfigured,
 * unreachable, or errors, the content is ALLOWED (and logged). A transient blip
 * at OpenAI must never take every match down. Only a positive `flagged:true`
 * from the API blocks. Set MODERATION_ENABLED=false to disable entirely.
 */

import "server-only";

import { ProviderError } from "@/lib/utils/errors";

const ENDPOINT = "https://api.openai.com/v1/moderations";
const MODEL = process.env.MODERATION_MODEL?.trim() || "omni-moderation-latest";
const TIMEOUT_MS = 6_000;
// Transcripts are screened as an ARRAY of message strings (not one giant blob)
// so nothing past a single cap is silently skipped. Each item is clamped and the
// item count is bounded to stay well under the endpoint's token ceiling.
const MAX_ITEM_CHARS = 8_000;
const MAX_ITEMS = 64;

export interface ModerationResult {
  /** True only when the API positively flagged the content. */
  flagged: boolean;
  /** Violated category keys (e.g. "hate", "sexual/minors"), when flagged. */
  categories: string[];
  /**
   * False when moderation could not actually run (unconfigured / transport
   * error) — the caller then fails OPEN. True when the API returned a verdict.
   */
  checked: boolean;
}

/** True when moderation is wired (OpenAI key present and not explicitly off). */
export function isModerationConfigured(): boolean {
  if ((process.env.MODERATION_ENABLED ?? "").trim().toLowerCase() === "false") {
    return false;
  }
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Run text through the moderation endpoint. Accepts a single string or an array
 * (each element scored independently; the whole input is flagged if ANY element
 * is). Never throws on a transport error — returns `{ checked:false }` so callers
 * fail open.
 */
export async function moderateText(
  input: string | string[],
  signal?: AbortSignal,
): Promise<ModerationResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!isModerationConfigured() || !key) {
    return { flagged: false, categories: [], checked: false };
  }

  const items = (Array.isArray(input) ? input : [input])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0)
    .slice(0, MAX_ITEMS)
    .map((s) => (s.length > MAX_ITEM_CHARS ? s.slice(0, MAX_ITEM_CHARS) : s));
  if (items.length === 0) return { flagged: false, categories: [], checked: true };

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  const onAbort = () => timeoutController.abort();
  if (signal) {
    if (signal.aborted) timeoutController.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: MODEL, input: items }),
      signal: timeoutController.signal,
    });
    if (!res.ok) {
      console.error("[moderation] API error (allowing):", res.status);
      return { flagged: false, categories: [], checked: false };
    }
    const data = (await res.json()) as {
      results?: { flagged?: boolean; categories?: Record<string, boolean> }[];
    };
    const categories = new Set<string>();
    let flagged = false;
    for (const r of data.results ?? []) {
      if (!r?.flagged) continue;
      flagged = true;
      for (const [cat, on] of Object.entries(r.categories ?? {})) {
        if (on) categories.add(cat);
      }
    }
    return { flagged, categories: [...categories], checked: true };
  } catch (err) {
    console.error("[moderation] threw (allowing):", err);
    return { flagged: false, categories: [], checked: false };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

/**
 * Throw CONTENT_BLOCKED when the input is positively flagged. Fails OPEN: if
 * moderation can't run, the content is allowed (availability over strictness,
 * matching the rate-limiter). Use this at the authoritative gates (the paid
 * debate turn, the public publish).
 */
export async function assertTextAllowed(
  input: string | string[],
  signal?: AbortSignal,
): Promise<void> {
  const { flagged } = await moderateText(input, signal);
  if (flagged) {
    throw new ProviderError(
      "CONTENT_BLOCKED",
      "This content was blocked by the safety filter",
    );
  }
}

// Topics that received a REAL "allowed" verdict from the API (checked:true and
// not flagged). Only genuine verdicts are cached — a fail-open pass
// (checked:false) is never cached, so a moderation outage can't whitelist a
// topic for the instance's lifetime. Bounded FIFO so a flood of unique topics
// can't grow memory unboundedly.
const ALLOWED_TOPIC_CACHE_MAX = 500;
const allowedTopics = new Set<string>();

/**
 * Per-turn topic gate for the paid debate routes. The server is stateless, so
 * "moderation already ran on this match's opening turn" cannot be inferred
 * from client-supplied turn state (a forged `status:"complete"` round would
 * skip the gate). Instead EVERY turn/verdict call re-asserts the topic; the
 * warm-instance cache above keeps the repeat calls free. Same fail-open
 * semantics as assertTextAllowed.
 */
export async function assertTopicAllowed(
  topic: string,
  signal?: AbortSignal,
): Promise<void> {
  const key = topic.trim();
  if (allowedTopics.has(key)) return;
  const { flagged, checked } = await moderateText(key, signal);
  if (flagged) {
    throw new ProviderError(
      "CONTENT_BLOCKED",
      "This content was blocked by the safety filter",
    );
  }
  if (checked) {
    if (allowedTopics.size >= ALLOWED_TOPIC_CACHE_MAX) {
      const oldest = allowedTopics.values().next().value;
      if (oldest !== undefined) allowedTopics.delete(oldest);
    }
    allowedTopics.add(key);
  }
}
