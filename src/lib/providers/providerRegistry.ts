/**
 * Provider registry (docs/07). The single place that maps a `providerId` to a
 * concrete provider. The engine/routes call `getProvider(id).generate(...)` and
 * never branch on the vendor. Server-only because it pulls in key-reading
 * providers. Adding OpenRouter later = one import + one map entry here.
 */

import "server-only";

import type {
  GenerateInput,
  GenerateResult,
  Provider,
  ProviderId,
} from "@/lib/providers/types";
import { openaiProvider } from "@/lib/providers/openaiProvider";
import { deepseekProvider } from "@/lib/providers/deepseekProvider";
import { openRouterProvider } from "@/lib/providers/openRouterProvider";
import { ProviderError, type AppErrorCode } from "@/lib/utils/errors";
import { MODEL_CATALOG, type Backend } from "@/lib/models/modelRegistry";
import type { DebateSession } from "@/lib/debate/debateTypes";

const registry: Partial<Record<ProviderId, Provider>> = {
  openai: openaiProvider,
  deepseek: deepseekProvider,
  openrouter: openRouterProvider,
};

export function getProvider(id: string): Provider {
  const provider = registry[id as ProviderId];
  if (!provider) {
    throw new ProviderError("INVALID_MODEL", `Unknown provider: ${id}`);
  }
  return provider;
}

const TRANSIENT: AppErrorCode[] = [
  "PROVIDER_ERROR",
  "PROVIDER_TIMEOUT",
  "RATE_LIMITED",
];

/**
 * Generate with automatic retries on TRANSIENT errors. Some providers (notably
 * DeepSeek on a cold first call) occasionally hiccup or return empty content; a
 * retry usually succeeds — so the user doesn't have to press "Retry" themselves.
 * Non-transient errors (missing key, invalid model, bad request) fail
 * immediately, and an aborted request never retries.
 *
 * `deadlineMs` (absolute epoch ms) bounds the TOTAL time so the serverless
 * invocation returns a clean JSON error before the platform kills it
 * (Vercel maxDuration). Each attempt's timeout is clamped to the remaining
 * budget, and retries stop once the budget is spent.
 */
export async function generateWithRetry(
  provider: Provider,
  input: GenerateInput,
  attempts = 3,
  deadlineMs?: number,
): Promise<GenerateResult> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    let perAttemptInput = input;
    if (deadlineMs !== undefined) {
      const remaining = deadlineMs - Date.now();
      if (remaining <= 1_000) break; // not enough budget for a meaningful attempt
      const timeoutMs = Math.min(input.timeoutMs ?? remaining, remaining);
      perAttemptInput = { ...input, timeoutMs };
    }
    try {
      return await provider.generate(perAttemptInput);
    } catch (err) {
      lastErr = err;
      const code = err instanceof ProviderError ? err.code : "UNKNOWN_ERROR";
      if (!TRANSIENT.includes(code)) throw err;
      if (input.signal?.aborted) throw err;
      if (deadlineMs !== undefined && deadlineMs - Date.now() <= 1_000) break;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1))); // 400ms, 800ms
      }
    }
  }
  throw lastErr ?? new ProviderError("PROVIDER_TIMEOUT");
}

/** Which backends have a key configured right now. */
export function providerAvailability() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  };
}

// Preferred neutral judges per backend (cheap + capable), tried before falling
// back to "any non-fighter model on that backend".
const PREFERRED_JUDGES: Record<Backend, string[]> = {
  openai: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4.1"],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  openrouter: [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ],
};

/**
 * Resolve the neutral "auto" judge based on which keys are present, NEVER
 * appointing one of the two debaters (an auto judge must be neutral). Walks
 * backends in key-preference order and picks the first model that isn't a
 * fighter; only if every candidate on every available backend is a fighter does
 * it fall back to one (degenerate same-provider setups), so the verdict still
 * runs rather than erroring.
 */
export function resolveAutoJudge(
  session?: DebateSession,
): { providerId: ProviderId; modelId: string } {
  const fighters = new Set(
    [session?.modelA.modelId, session?.modelB.modelId].filter(Boolean),
  );
  const order: Backend[] = [];
  if (process.env.OPENAI_API_KEY) order.push("openai");
  if (process.env.DEEPSEEK_API_KEY) order.push("deepseek");
  if (process.env.OPENROUTER_API_KEY) order.push("openrouter");
  // No keys at all (shouldn't happen if a turn already generated): keep the old
  // OpenRouter free default so the route still produces a verdict.
  if (order.length === 0) order.push("openrouter");

  for (const backend of order) {
    // Preferred neutral picks first…
    for (const id of PREFERRED_JUDGES[backend]) {
      if (!fighters.has(id) && MODEL_CATALOG.some((m) => m.id === id)) {
        return { providerId: backend, modelId: id };
      }
    }
    // …then any other catalog model on this backend that isn't a fighter.
    const neutral = MODEL_CATALOG.find(
      (m) => m.providerId === backend && !fighters.has(m.id),
    );
    if (neutral) return { providerId: backend, modelId: neutral.id };
  }

  // Degenerate: both fighters exhaust the only available backend. Accept a
  // fighter as judge rather than failing the verdict outright.
  const first = PREFERRED_JUDGES[order[0]][0];
  return { providerId: order[0], modelId: first };
}
