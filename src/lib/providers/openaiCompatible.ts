/**
 * Shared caller for OpenAI-compatible Chat Completions APIs. Both the OpenAI and
 * DeepSeek providers use this (DeepSeek's API is OpenAI-compatible), and a future
 * OpenRouter provider can reuse it too. Server-only — never imported by the UI.
 */

import "server-only";

import type { TokenUsage } from "@/lib/debate/debateTypes";
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
}

interface ChatCallResult {
  content: string;
  usage?: TokenUsage;
  finishReason?: string;
}

function mapHttpStatus(status: number): AppErrorCode {
  if (status === 401 || status === 403) return "MISSING_API_KEY";
  if (status === 404) return "INVALID_MODEL";
  if (status === 429) return "RATE_LIMITED";
  if (status === 408 || status === 504) return "PROVIDER_TIMEOUT";
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
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const content = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) throw new ProviderError("PROVIDER_ERROR");

    const usage: TokenUsage | undefined = data.usage
      ? {
          inputTokens: data.usage.prompt_tokens ?? 0,
          outputTokens: data.usage.completion_tokens ?? 0,
          totalTokens:
            data.usage.total_tokens ??
            (data.usage.prompt_tokens ?? 0) + (data.usage.completion_tokens ?? 0),
        }
      : undefined;

    return { content, usage, finishReason: data.choices?.[0]?.finish_reason };
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
