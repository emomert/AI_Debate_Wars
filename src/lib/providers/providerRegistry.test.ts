import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateWithRetry } from "./providerRegistry";
import { ProviderError } from "@/lib/utils/errors";
import type { GenerateInput, GenerateResult, Provider } from "./types";

const MODEL = {
  providerId: "openrouter" as const,
  modelId: "moonshotai/kimi-k2.6",
  maxOutputTokens: 8192,
  supportsStreaming: true,
  reasoningEffort: "low" as const,
};

function input(maxOutputTokens: number): GenerateInput {
  return {
    model: MODEL,
    systemPrompt: "sys",
    userPrompt: "user",
    temperature: 0.8,
    maxOutputTokens,
    kind: "turn",
  };
}

const ok: GenerateResult = { content: "a fine answer", latencyMs: 5 };

/** Provider that throws the given codes in order, then succeeds. */
function scriptedProvider(codes: string[], calls: GenerateInput[]): Provider {
  let i = 0;
  return {
    id: "openrouter",
    generate: async (inp) => {
      calls.push(inp);
      const code = codes[i++];
      if (code) throw new ProviderError(code as never);
      return ok;
    },
  };
}

describe("generateWithRetry — token-ceiling escalation", () => {
  it("retries ONCE at the model's full ceiling after TOKEN_LIMIT_EXCEEDED", async () => {
    const calls: GenerateInput[] = [];
    const provider = scriptedProvider(["TOKEN_LIMIT_EXCEEDED"], calls);
    const result = await generateWithRetry(provider, input(380), 3);
    expect(result).toBe(ok);
    expect(calls).toHaveLength(2);
    expect(calls[0].maxOutputTokens).toBe(380);
    expect(calls[1].maxOutputTokens).toBe(MODEL.maxOutputTokens);
  });

  it("escalates only once — a second ceiling hit surfaces the error", async () => {
    const calls: GenerateInput[] = [];
    const provider = scriptedProvider(
      ["TOKEN_LIMIT_EXCEEDED", "TOKEN_LIMIT_EXCEEDED", "TOKEN_LIMIT_EXCEEDED"],
      calls,
    );
    await expect(generateWithRetry(provider, input(380), 3)).rejects.toMatchObject({
      code: "TOKEN_LIMIT_EXCEEDED",
    });
    expect(calls).toHaveLength(2); // original + one escalation, no loop
  });

  it("does not escalate when the call already ran at the full ceiling", async () => {
    const calls: GenerateInput[] = [];
    const provider = scriptedProvider(["TOKEN_LIMIT_EXCEEDED"], calls);
    await expect(
      generateWithRetry(provider, input(MODEL.maxOutputTokens), 3),
    ).rejects.toMatchObject({ code: "TOKEN_LIMIT_EXCEEDED" });
    expect(calls).toHaveLength(1);
  });

  it("still fails fast on other deterministic errors", async () => {
    const calls: GenerateInput[] = [];
    const provider = scriptedProvider(["INVALID_REQUEST"], calls);
    await expect(generateWithRetry(provider, input(380), 3)).rejects.toMatchObject({
      code: "INVALID_REQUEST",
    });
    expect(calls).toHaveLength(1);
  });

  it("keeps retrying transient errors as before", async () => {
    const calls: GenerateInput[] = [];
    const provider = scriptedProvider(["PROVIDER_ERROR"], calls);
    const result = await generateWithRetry(provider, input(380), 3);
    expect(result).toBe(ok);
    expect(calls).toHaveLength(2);
    expect(calls[1].maxOutputTokens).toBe(380); // transient retry, not escalation
  });
});
