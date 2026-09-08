import { describe, expect, it } from "vitest";
import { calculateCost } from "./calculateCost";

describe("cache-write accounting", () => {
  it("bounds cache writes to the non-hit portion without double billing", () => {
    const cost = calculateCost("openai", "gpt-6-astra", {
      inputTokens: 100, outputTokens: 0, totalTokens: 100,
      cachedInputTokens: 60, cacheWriteInputTokens: 999,
    });
    expect(cost.inputCost).toBeCloseTo(0.00056, 9);
  });
  it("preserves ordinary input billing when no cache-write rate is defined", () => {
    const usage = { inputTokens: 100, outputTokens: 10, totalTokens: 110 };
    expect(calculateCost("openai", "gpt-4.1-mini", { ...usage, cacheWriteInputTokens: 80 }))
      .toEqual(calculateCost("openai", "gpt-4.1-mini", usage));
  });
});
