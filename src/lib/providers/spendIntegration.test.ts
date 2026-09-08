import { afterEach, beforeEach, expect, it, vi } from "vitest";
const budget = vi.hoisted(() => ({ reserve: vi.fn(), settle: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/security/spendBudget", () => ({
  reserveSpend: budget.reserve,
  completionReservationUsd: () => 0.1,
}));
import { callChatCompletions } from "./openaiCompatible";
const opts = { providerId: "openai", baseUrl: "https://example.test/v1", apiKey: "test-key",
  model: "gpt-4.1-mini", systemPrompt: "system", userPrompt: "user", temperature: 0.5,
  maxOutputTokens: 100, timeoutMs: 1000 };
beforeEach(() => { budget.reserve.mockReset().mockResolvedValue(budget.settle); budget.settle.mockReset().mockResolvedValue(undefined); });
afterEach(() => vi.unstubAllGlobals());

it("settles hidden-thinking usage before reporting an empty answer, then reserves the next attempt", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "" }, finish_reason: "length" }],
      usage: { prompt_tokens: 100, completion_tokens: 100 } })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "An answer" } }],
      usage: { prompt_tokens: 100, completion_tokens: 20 } })));
  vi.stubGlobal("fetch", fetcher);
  await expect(callChatCompletions(opts)).rejects.toMatchObject({ code: "TOKEN_LIMIT_EXCEEDED" });
  expect(budget.settle).toHaveBeenCalledWith(expect.any(Number));
  expect(budget.settle.mock.calls[0]![0]).toBeGreaterThan(0);
  await expect(callChatCompletions(opts)).resolves.toMatchObject({ content: "An answer" });
  expect(budget.reserve).toHaveBeenCalledTimes(2);
});

it("retains an uncertain failed call's booking", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timeout", "AbortError")));
  await expect(callChatCompletions(opts)).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
  expect(budget.reserve).toHaveBeenCalledOnce();
  expect(budget.settle).not.toHaveBeenCalled();
});

it("does not dispatch to the provider when the reservation is denied", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  budget.reserve.mockRejectedValue(new Error("Storage unavailable"));
  await expect(callChatCompletions(opts)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
