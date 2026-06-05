/**
 * OpenRouter provider (docs/07). Server-only. OpenRouter is an OpenAI-compatible
 * gateway to many models (Qwen, Llama, Kimi, GLM, Gemma, GPT-OSS, …), including
 * a rotating set of FREE models. Reads OPENROUTER_API_KEY from the environment.
 *
 * Models are presented in the UI under their real brand (Qwen, Llama, …), not as
 * "OpenRouter" — that's handled by the model registry; this file only routes the
 * call.
 */

import "server-only";

import type { GenerateInput, GenerateResult, Provider } from "@/lib/providers/types";
import { callChatCompletions } from "@/lib/providers/openaiCompatible";

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export const openRouterProvider: Provider = {
  id: "openrouter",
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const start = Date.now();
    // Many free OpenRouter models (Qwen3, GLM, Nemotron, …) reason internally,
    // which eats the token budget — give headroom; the prompt controls visible
    // length.
    const maxOutputTokens = Math.min(
      input.model.maxOutputTokens,
      input.maxOutputTokens + 2500,
    );
    const { content, usage, finishReason } = await callChatCompletions({
      baseUrl: OPENROUTER_BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
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
      usageEstimated: !usage,
    };
  },
};
