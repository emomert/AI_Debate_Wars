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
import { ProviderError } from "@/lib/utils/errors";

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

// Per-process memo of models that rejected the `reasoning` param (warm-instance
// only; resets on cold start). Lets later turns skip the doomed capped call.
const reasoningUnsupported = new Set<string>();

export const openRouterProvider: Provider = {
  id: "openrouter",
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const start = Date.now();
    // Many free OpenRouter models (GLM, Nemotron, GPT-OSS, Kimi, …) reason
    // internally before answering, which eats both time and the token budget.
    // Models tagged with `reasoningEffort` get their hidden thinking CAPPED via
    // OpenRouter's unified `reasoning` param (the cap floors at ~1024 tokens),
    // so they answer in seconds instead of half a minute — and they need far
    // less headroom. Untagged reasoners keep the generous old headroom.
    const effort = input.model.reasoningEffort;
    const maxOutputTokens = Math.min(
      input.model.maxOutputTokens,
      input.maxOutputTokens + (effort ? 1300 : 2500),
    );
    // Deep Debate: the ":online" suffix makes OpenRouter run a web search before
    // generating and return url_citation annotations — zero body changes, works
    // on any model. (Note: this bills ~$0.005/search even on :free models.)
    const model = input.webSearch
      ? `${input.model.modelId}:online`
      : input.model.modelId;
    const baseCall = {
      baseUrl: OPENROUTER_BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      model,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      temperature: input.temperature,
      maxOutputTokens,
      // Generous: free reasoning models can take 20s+ on a cold first call.
      timeoutMs: input.timeoutMs ?? 90_000,
      signal: input.signal,
    };

    const useCap = effort && !reasoningUnsupported.has(input.model.modelId);
    let response;
    if (useCap) {
      try {
        response = await callChatCompletions({
          ...baseCall,
          extraBody: { reasoning: { effort } },
        });
      } catch (err) {
        // Narrow safety net: only a deterministic bad-request (INVALID_REQUEST,
        // i.e. an HTTP 400 — the model rejecting the `reasoning` param) triggers
        // the uncapped retry. 5xx / empty-content / timeouts are rethrown so we
        // don't silently double every call and strip the speed cap on a fluke.
        if (err instanceof ProviderError && err.code === "INVALID_REQUEST") {
          reasoningUnsupported.add(input.model.modelId); // skip the cap next time
          response = await callChatCompletions(baseCall);
        } else {
          throw err;
        }
      }
    } else {
      response = await callChatCompletions(baseCall);
    }

    const { content, usage, finishReason, citations } = response;
    return {
      content,
      usage,
      finishReason,
      citations,
      latencyMs: Date.now() - start,
    };
  },
};
