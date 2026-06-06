/**
 * Provider abstraction (docs/03, docs/07). The debate engine and API routes only
 * ever talk to this interface — never to a specific vendor SDK. Adding a new
 * backend means adding one more `Provider` implementation + a registry entry,
 * with zero changes to the UI or the engine.
 *
 * NOTE: `providerId` here is the BACKEND (which API to call: openai / deepseek /
 * openrouter). How a model is presented in the UI ("brand": Qwen, Llama, …) is a
 * separate, display-only concern handled by the model registry.
 */

import type { TokenUsage } from "@/lib/debate/debateTypes";

export type ProviderId = "openai" | "deepseek" | "openrouter";

export type GenerationKind = "turn" | "judge";

/** Minimal model config a provider needs to make a call. */
export interface ProviderModelConfig {
  providerId: ProviderId;
  modelId: string;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  /**
   * Cap the hidden chain-of-thought of reasoning models (OpenRouter's unified
   * `reasoning.effort` param). Set in the model registry for free reasoning
   * models that otherwise "think" for 30s+; non-reasoning models ignore it.
   */
  reasoningEffort?: "low" | "medium";
}

export interface GenerateInput {
  model: ProviderModelConfig;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  kind: GenerationKind;
  /** Caller cancellation (e.g. user pressed Stop). */
  signal?: AbortSignal;
  /** Per-call timeout in ms. */
  timeoutMs?: number;
}

export interface GenerateResult {
  content: string;
  /** Present when the provider reports usage; otherwise estimated upstream. */
  usage?: TokenUsage;
  latencyMs: number;
  finishReason?: string;
  /** True when usage was estimated from text rather than reported by the API. */
  usageEstimated?: boolean;
}

export interface Provider {
  id: ProviderId;
  /** Generate exactly ONE response. Providers never loop or chain turns. */
  generate(input: GenerateInput): Promise<GenerateResult>;
}
