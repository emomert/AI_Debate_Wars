/**
 * DeepSeek provider (docs/07). Server-only. DeepSeek exposes an OpenAI-compatible
 * Chat Completions API, so it reuses the shared caller. Reads DEEPSEEK_API_KEY
 * from the environment.
 */

import "server-only";

import type { GenerateInput, GenerateResult, Provider } from "@/lib/providers/types";
import { callChatCompletions } from "@/lib/providers/openaiCompatible";

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1";

export const deepseekProvider: Provider = {
  id: "deepseek",
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const start = Date.now();
    // DeepSeek V4 models reason internally, and that reasoning counts against
    // max_tokens — so a tight budget starves the visible answer (it can come back
    // as a tiny/empty reply). Give generous headroom; the prompt still controls
    // the visible length.
    const maxOutputTokens = Math.min(
      input.model.maxOutputTokens,
      input.maxOutputTokens + 2500,
    );
    const { content, usage, finishReason } = await callChatCompletions({
      baseUrl: DEEPSEEK_BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
      model: input.model.modelId,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      temperature: input.temperature,
      maxOutputTokens,
      timeoutMs: input.timeoutMs ?? 90_000,
      signal: input.signal,
    });
    return {
      content,
      usage,
      finishReason,
      latencyMs: Date.now() - start,
    };
  },
};
