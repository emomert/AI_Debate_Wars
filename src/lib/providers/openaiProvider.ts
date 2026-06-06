/**
 * OpenAI provider (docs/07). Server-only. Reads OPENAI_API_KEY from the
 * environment — the key never reaches the browser.
 */

import "server-only";

import type { GenerateInput, GenerateResult, Provider } from "@/lib/providers/types";
import { callChatCompletions } from "@/lib/providers/openaiCompatible";

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

/**
 * gpt-5.x and o-series use the newer param name (max_completion_tokens).
 * NOTE: the `*-chat-latest` variants are NOT reasoning models — they accept a
 * custom temperature and don't burn hidden reasoning tokens. So we split the two
 * concerns: `isNewStyleModel` (param name) vs `isReasoningStyle` (drop
 * temperature + add headroom), so our two flagship chat models keep their tuned
 * temperature (0.8 turns / 0.4 judge).
 */
function isNewStyleModel(modelId: string): boolean {
  return /^(gpt-5|o[0-9])/.test(modelId);
}

function isReasoningStyle(modelId: string): boolean {
  return /^(gpt-5|o[0-9])/.test(modelId) && !modelId.includes("-chat");
}

export const openaiProvider: Provider = {
  id: "openai",
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const start = Date.now();
    const newStyle = isNewStyleModel(input.model.modelId);
    const reasoning = isReasoningStyle(input.model.modelId);

    // True reasoning models spend tokens on hidden reasoning, so give the budget
    // headroom; the prompt still controls the visible length. Chat + classic
    // models keep the exact requested cap.
    const maxOutputTokens = reasoning
      ? Math.min(input.model.maxOutputTokens, input.maxOutputTokens + 2000)
      : input.maxOutputTokens;

    const { content, usage, finishReason } = await callChatCompletions({
      baseUrl: OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY ?? "",
      model: input.model.modelId,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      temperature: input.temperature,
      maxOutputTokens,
      timeoutMs: input.timeoutMs ?? 60_000,
      signal: input.signal,
      tokenParam: newStyle ? "max_completion_tokens" : "max_tokens",
      includeTemperature: !reasoning,
    });
    return {
      content,
      usage,
      finishReason,
      latencyMs: Date.now() - start,
    };
  },
};
