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
 * Generate with one automatic retry on TRANSIENT errors. Some providers
 * (notably DeepSeek on a cold first call) occasionally hiccup or return empty
 * content; a single retry usually succeeds — so the user doesn't have to press
 * "Retry" themselves. Non-transient errors (missing key, invalid model) fail
 * immediately, and an aborted request never retries.
 */
export async function generateWithRetry(
  provider: Provider,
  input: GenerateInput,
  attempts = 3,
): Promise<GenerateResult> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await provider.generate(input);
    } catch (err) {
      lastErr = err;
      const code = err instanceof ProviderError ? err.code : "UNKNOWN_ERROR";
      if (!TRANSIENT.includes(code)) throw err;
      if (input.signal?.aborted) throw err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1))); // 400ms, 800ms
      }
    }
  }
  throw lastErr;
}

/** Which backends have a key configured right now. */
export function providerAvailability() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  };
}

/** Resolve the neutral "auto" judge based on which keys are present. */
export function resolveAutoJudge(): { providerId: ProviderId; modelId: string } {
  if (process.env.OPENAI_API_KEY)
    return { providerId: "openai", modelId: "gpt-4.1-mini" };
  if (process.env.DEEPSEEK_API_KEY)
    return { providerId: "deepseek", modelId: "deepseek-v4-flash" };
  // Free, neutral fallback if only OpenRouter is configured.
  return { providerId: "openrouter", modelId: "qwen/qwen3-next-80b-a3b-instruct:free" };
}
