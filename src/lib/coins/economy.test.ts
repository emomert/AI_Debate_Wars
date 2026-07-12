import { describe, expect, it } from "vitest";

import {
  COIN_USD,
  MIN_MARGIN_MULTIPLE,
  coinPriceForModel,
  estimatedFighterCostUsd,
  matchCoinCost,
  premiumCoinCost,
  COIN_PACKS,
} from "./economy";
import { FREE_MAX_FIGHTER_COINS } from "./config";
import { MODEL_CATALOG } from "@/lib/models/modelRegistry";

describe("coin economy — catalog coverage & margins", () => {
  it("every catalog model has an explicit coin price", () => {
    for (const m of MODEL_CATALOG) {
      const coins = coinPriceForModel(m.id);
      expect([1, 2, 4, 8, 12, 20], `${m.id} has a valid band`).toContain(coins);
    }
  });

  it(`every model clears the ${MIN_MARGIN_MULTIPLE}x margin floor at $${COIN_USD}/coin`, () => {
    for (const m of MODEL_CATALOG) {
      const retail = coinPriceForModel(m.id) * COIN_USD;
      const cost = estimatedFighterCostUsd(m.id);
      expect(
        retail / cost,
        `${m.id}: ${retail.toFixed(2)} retail vs ${cost.toFixed(4)} cost`,
      ).toBeGreaterThanOrEqual(MIN_MARGIN_MULTIPLE);
    }
  });

  it("free daily coins cover at least half the catalog", () => {
    const freeEligible = MODEL_CATALOG.filter(
      (m) => coinPriceForModel(m.id) <= FREE_MAX_FIGHTER_COINS,
    );
    expect(freeEligible.length).toBeGreaterThanOrEqual(MODEL_CATALOG.length / 2);
  });

  it("anchors match the owner-approved bands", () => {
    expect(coinPriceForModel("deepseek-v4-flash")).toBe(1);
    expect(coinPriceForModel("gpt-5.4-mini")).toBe(1);
    expect(coinPriceForModel("anthropic/claude-haiku-4.5")).toBe(2);
    expect(coinPriceForModel("anthropic/claude-sonnet-5")).toBe(4);
    expect(coinPriceForModel("gpt-5.5")).toBe(12);
    expect(coinPriceForModel("anthropic/claude-fable-5")).toBe(20);
  });
});

describe("matchCoinCost", () => {
  const base = {
    modelAId: "deepseek-v4-flash",
    modelBId: "gpt-5.4-mini",
    deepDebate: false,
    responseLength: "short" as const,
  };

  it("sums the two fighters", () => {
    expect(matchCoinCost(base)).toBe(2);
    expect(matchCoinCost({ ...base, modelBId: "gpt-5.5" })).toBe(13);
  });

  it("long doubles the fighter total; medium does not", () => {
    expect(matchCoinCost({ ...base, responseLength: "long" })).toBe(4);
    expect(matchCoinCost({ ...base, responseLength: "medium" })).toBe(2);
  });

  it("deep debate adds a flat 2 after the length multiplier", () => {
    expect(matchCoinCost({ ...base, deepDebate: true })).toBe(4);
    expect(matchCoinCost({ ...base, deepDebate: true, responseLength: "long" })).toBe(6);
  });

  it("boss-fight mirror: Fable vs Fable = 40", () => {
    expect(
      matchCoinCost({ ...base, modelAId: "anthropic/claude-fable-5", modelBId: "anthropic/claude-fable-5" }),
    ).toBe(40);
  });
});

describe("premiumCoinCost — the share only purchased coins may pay", () => {
  it("is zero for a free-eligible pair", () => {
    expect(
      premiumCoinCost({ modelAId: "deepseek-v4-flash", modelBId: "anthropic/claude-sonnet-5", deepDebate: true, responseLength: "short" }),
    ).toBe(0);
  });

  it("counts only fighters above the free band, with the length multiplier", () => {
    const cfg = { modelAId: "gpt-5.5", modelBId: "deepseek-v4-flash", deepDebate: false, responseLength: "short" as const };
    expect(premiumCoinCost(cfg)).toBe(12);
    expect(premiumCoinCost({ ...cfg, responseLength: "long" as const })).toBe(24);
  });
});

describe("coin packs", () => {
  it("match the owner-set tiers", () => {
    expect(COIN_PACKS.map((p) => [p.usd, p.coins])).toEqual([
      [4.99, 100],
      [9.99, 250],
      [19.99, 700],
    ]);
  });
});
