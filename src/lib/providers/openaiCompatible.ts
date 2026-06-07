/**
 * Shared caller for OpenAI-compatible Chat Completions APIs. Both the OpenAI and
 * DeepSeek providers use this (DeepSeek's API is OpenAI-compatible), and a future
 * OpenRouter provider can reuse it too. Server-only — never imported by the UI.
 */

import "server-only";

import type { Citation, TokenUsage } from "@/lib/debate/debateTypes";
import { ProviderError, type AppErrorCode } from "@/lib/utils/errors";

interface ChatCallOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Newer OpenAI models (gpt-5, o-series) require "max_completion_tokens". */
  tokenParam?: "max_tokens" | "max_completion_tokens";
  /** Some newer models reject a custom temperature; omit it when false. */
  includeTemperature?: boolean;
  /**
   * Extra vendor-specific top-level body fields (e.g. OpenRouter's `reasoning`).
   * Spread FIRST so the explicit options above always win on collisions.
   */
  extraBody?: Record<string, unknown>;
}

interface ChatCallResult {
  content: string;
  usage?: TokenUsage;
  finishReason?: string;
  citations?: Citation[];
}

/** OpenAI/OpenRouter url_citation annotation shape (both standardize to this). */
interface UrlCitationAnnotation {
  type?: string;
  url_citation?: {
    url?: string;
    title?: string;
    content?: string;
  };
}

/**
 * Normalize message.annotations (OpenAI + OpenRouter both return the same
 * url_citation shape) into our Citation[], de-duplicated by URL and numbered.
 */
function parseCitations(annotations: unknown): Citation[] | undefined {
  if (!Array.isArray(annotations)) return undefined;
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const raw of annotations as UrlCitationAnnotation[]) {
    const c = raw?.url_citation;
    const url = typeof c?.url === "string" ? c.url : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      index: out.length + 1,
      title: (typeof c?.title === "string" && c.title.trim()) || url,
      url,
      quote:
        typeof c?.content === "string" && c.content.trim()
          ? c.content.trim().slice(0, 500)
          : undefined,
    });
  }
  return out.length > 0 ? out : undefined;
}

function mapHttpStatus(status: number): AppErrorCode {
  if (status === 401 || status === 403) return "MISSING_API_KEY";
  if (status === 402) return "INSUFFICIENT_CREDITS"; // out of provider credits
  if (status === 404) return "INVALID_MODEL";
  if (status === 429) return "RATE_LIMITED";
  if (status === 408 || status === 504) return "PROVIDER_TIMEOUT";
  // A 400 is a deterministic bad request (e.g. an unsupported param like
  // `reasoning`); map it to a NON-transient code so it fails fast instead of
  // being retried, and so callers can detect param rejection specifically.
  if (status === 400 || status === 422) return "INVALID_REQUEST";
  return "PROVIDER_ERROR";
}

export async function callChatCompletions(
  opts: ChatCallOptions,
): Promise<ChatCallResult> {
  const {
    baseUrl,
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    temperature,
    maxOutputTokens,
    timeoutMs,
    signal,
    tokenParam = "max_tokens",
    includeTemperature = true,
    extraBody,
  } = opts;

  if (!apiKey) throw new ProviderError("MISSING_API_KEY");

  // Combine the caller's signal with a local timeout.
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const onAbort = () => timeoutController.abort();
  if (signal) {
    if (signal.aborted) timeoutController.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...(extraBody ?? {}),
        model,
        ...(includeTemperature ? { temperature } : {}),
        [tokenParam]: maxOutputTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: timeoutController.signal,
    });

    if (!res.ok) {
      // Don't leak raw provider error bodies to the client.
      throw new ProviderError(mapHttpStatus(res.status));
    }

    const data = (await res.json()) as {
      choices?: {
        message?: { content?: string; annotations?: unknown };
        finish_reason?: string;
      }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        // OpenAI / OpenRouter expose cache-hit input tokens nested here…
        prompt_tokens_details?: { cached_tokens?: number };
        // …while DeepSeek's native endpoint puts them at the top level.
        prompt_cache_hit_tokens?: number;
      };
    };

    const choice = data.choices?.[0];
    const finishReason = choice?.finish_reason;
    const content = choice?.message?.content?.trim() ?? "";
    const citations = parseCitations(choice?.message?.annotations);
    if (!content) {
      // Empty content with finish_reason "length" means the model spent its
      // entire token budget on hidden reasoning and never emitted an answer.
      // That's deterministic (not a transient hiccup), so surface the
      // token-ceiling error and let it fail fast instead of retrying blindly.
      if (finishReason === "length") throw new ProviderError("TOKEN_LIMIT_EXCEEDED");
      throw new ProviderError("PROVIDER_ERROR");
    }

    const inputTokens = data.usage?.prompt_tokens ?? 0;
    // Cache-hit input tokens: OpenAI/OpenRouter nest it, DeepSeek tops it.
    // Clamp to inputTokens so a malformed payload can't make cached > input.
    const cachedInputTokens = Math.min(
      inputTokens,
      data.usage?.prompt_tokens_details?.cached_tokens ??
        data.usage?.prompt_cache_hit_tokens ??
        0,
    );
    const usage: TokenUsage | undefined = data.usage
      ? {
          inputTokens,
          outputTokens: data.usage.completion_tokens ?? 0,
          totalTokens:
            data.usage.total_tokens ??
            inputTokens + (data.usage.completion_tokens ?? 0),
          ...(cachedInputTokens > 0 ? { cachedInputTokens } : {}),
        }
      : undefined;

    return { content, usage, finishReason, citations };
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      // Distinguish a user cancel from a timeout where possible.
      throw new ProviderError("PROVIDER_TIMEOUT");
    }
    throw new ProviderError("PROVIDER_ERROR");
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
