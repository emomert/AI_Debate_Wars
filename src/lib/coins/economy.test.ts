import { describe, expect, it } from "vitest";

import {
  LOWEST_NET_COIN_USD,
  MIN_MARGIN_MULTIPLE,
  INCLUDED_AUTO_JUDGE_COIN_ALLOCATION,
  DEEP_DEBATE_COIN_SURCHARGE,
  coinPriceForModel,
  estimatedAutoJudgeCostUsd,
  estimatedFighterCostUsd,
  estimatedJudgeCostUsd,
  estimatedMatchCostUsd,
  matchCoinCost,
  netPackRevenueUsd,
  netCoinUsd,
  premiumCoinCost,
  judgeCoinCost,
  judgePremiumCoinCost,
  COIN_PACKS,
  MODEL_COINS,
} from "./economy";
import { FREE_MAX_FIGHTER_COINS } from "./config";
import { MODEL_CATALOG } from "@/lib/models/modelRegistry";

describe("coin economy — catalog coverage & margins", () => {
  it("every catalog model has an explicit coin price", () => {
    for (const m of MODEL_CATALOG) {
      expect(Object.hasOwn(MODEL_COINS, m.id), `${m.id} has an explicit price`).toBe(true);
      const coins = coinPriceForModel(m.id);
      expect([4, 8, 12, 40, 80, 160], `${m.id} has a valid band`).toContain(coins);
    }
  });

  it(`every model clears the ${MIN_MARGIN_MULTIPLE}x floor at the least net pack value`, () => {
    for (const m of MODEL_CATALOG) {
      for (const options of [
        { responseLength: "short" as const, deepDebate: false },
        { responseLength: "medium" as const, deepDebate: false },
        { responseLength: "long" as const, deepDebate: false },
      ]) {
        const retail = coinPriceForModel(m.id) * LOWEST_NET_COIN_USD;
        const cost = estimatedFighterCostUsd(m.id, options);
        expect(
          retail / cost,
          `${m.id} ${options.responseLength}/${options.deepDebate ? "deep" : "standard"}: ${retail.toFixed(3)} net vs ${cost.toFixed(4)} cost`,
        ).toBeGreaterThanOrEqual(MIN_MARGIN_MULTIPLE);
      }
    }
  });

  it("prices complete deep/long matches, including the included Auto judge", () => {
    for (const a of MODEL_CATALOG) {
      for (const b of MODEL_CATALOG) {
        const input = {
          modelAId: a.id,
          modelBId: b.id,
          deepDebate: true,
          responseLength: "long" as const,
        };
        const revenue = matchCoinCost(input) * LOWEST_NET_COIN_USD;
        const cost = estimatedMatchCostUsd(input);
        expect(revenue / cost, `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(MIN_MARGIN_MULTIPLE);
      }
    }
  });

  it("prices every selectable third-model judge against its conservative verdict cost", () => {
    for (const m of MODEL_CATALOG) {
      const revenue = coinPriceForModel(m.id) * LOWEST_NET_COIN_USD;
      expect(revenue / estimatedJudgeCostUsd(m.id), `${m.id} judge`).toBeGreaterThanOrEqual(MIN_MARGIN_MULTIPLE);
    }
    expect(estimatedAutoJudgeCostUsd()).toBeGreaterThan(0);
  });

  it("free daily coins cover at least half the catalog", () => {
    const freeEligible = MODEL_CATALOG.filter(
      (m) => coinPriceForModel(m.id) <= FREE_MAX_FIGHTER_COINS,
    );
    expect(freeEligible.length).toBeGreaterThanOrEqual(MODEL_CATALOG.length / 2);
  });

  it("anchors match the owner-approved bands", () => {
    expect(coinPriceForModel("deepseek-v4-flash")).toBe(4);
    expect(coinPriceForModel("gpt-5.4-mini")).toBe(40);
    expect(coinPriceForModel("anthropic/claude-haiku-4.5")).toBe(4);
    expect(coinPriceForModel("anthropic/claude-sonnet-5")).toBe(40);
    expect(coinPriceForModel("gpt-5.5")).toBe(160);
    expect(coinPriceForModel("anthropic/claude-fable-5")).toBe(160);
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
    expect(matchCoinCost(base)).toBe(44 + INCLUDED_AUTO_JUDGE_COIN_ALLOCATION);
    expect(matchCoinCost({ ...base, modelBId: "gpt-5.5" })).toBe(164 + INCLUDED_AUTO_JUDGE_COIN_ALLOCATION);
  });

  it("long doubles the fighter total; medium does not", () => {
    expect(matchCoinCost({ ...base, responseLength: "long" })).toBe(88 + INCLUDED_AUTO_JUDGE_COIN_ALLOCATION);
    expect(matchCoinCost({ ...base, responseLength: "medium" })).toBe(44 + INCLUDED_AUTO_JUDGE_COIN_ALLOCATION);
  });

  it("deep debate adds the metered surcharge after the length multiplier", () => {
    expect(matchCoinCost({ ...base, deepDebate: true })).toBe(44 + INCLUDED_AUTO_JUDGE_COIN_ALLOCATION + DEEP_DEBATE_COIN_SURCHARGE);
    expect(matchCoinCost({ ...base, deepDebate: true, responseLength: "long" })).toBe(88 + INCLUDED_AUTO_JUDGE_COIN_ALLOCATION + DEEP_DEBATE_COIN_SURCHARGE);
  });

  it("boss-fight mirror: Fable vs Fable = 324", () => {
    expect(
      matchCoinCost({ ...base, modelAId: "anthropic/claude-fable-5", modelBId: "anthropic/claude-fable-5" }),
    ).toBe(324);
  });

  it("the match charge includes the verdict allocation — a picked judge is separate", () => {
    // Judge cost was decoupled from the match charge (2026-07-13 security fix):
    // charging the judge at the verdict route, keyed on the RESOLVED judge, is
    // what closes the free-premium-judge bypass. So matchCoinCost never varies
    // with the judge — an unused `judge` field is simply ignored.
    expect(matchCoinCost(base)).toBe(44 + INCLUDED_AUTO_JUDGE_COIN_ALLOCATION);
    expect(matchCoinCost({ ...base, responseLength: "long" })).toBe(88 + INCLUDED_AUTO_JUDGE_COIN_ALLOCATION);
  });
});

describe("judgeCoinCost — charged at the verdict route (decoupled 2026-07-13)", () => {
  it("is free for the auto judge and for a fighter-as-judge", () => {
    expect(judgeCoinCost({ mode: "auto" })).toBe(0);
    expect(judgeCoinCost({ mode: "modelA" })).toBe(0);
    expect(judgeCoinCost({ mode: "modelB" })).toBe(0);
    expect(judgeCoinCost(undefined)).toBe(0);
  });

  it("charges a picked third-model judge its flat coin price (no length multiplier)", () => {
    expect(judgeCoinCost({ mode: "thirdModel", modelId: "anthropic/claude-fable-5" })).toBe(160);
    expect(judgeCoinCost({ mode: "thirdModel", modelId: "gpt-5.5" })).toBe(160);
    expect(judgeCoinCost({ mode: "thirdModel", modelId: "anthropic/claude-haiku-4.5" })).toBe(4);
    // A thirdModel mode with no model id can't be priced → free (validated elsewhere).
    expect(judgeCoinCost({ mode: "thirdModel" })).toBe(0);
  });

  it("only a premium picked judge (above the free band) draws on purchased coins", () => {
    expect(judgePremiumCoinCost({ mode: "thirdModel", modelId: "gpt-5.5" })).toBe(160);
    expect(judgePremiumCoinCost({ mode: "thirdModel", modelId: "anthropic/claude-haiku-4.5" })).toBe(0);
    expect(judgePremiumCoinCost({ mode: "auto" })).toBe(0);
  });
});

describe("premiumCoinCost — the share only purchased coins may pay", () => {
  it("is zero for a free-eligible pair", () => {
    expect(
      premiumCoinCost({ modelAId: "deepseek-v4-flash", modelBId: "anthropic/claude-haiku-4.5", deepDebate: true, responseLength: "short" }),
    ).toBe(DEEP_DEBATE_COIN_SURCHARGE);
  });

  it("counts only fighters above the free band, with the length multiplier", () => {
    const cfg = { modelAId: "gpt-5.5", modelBId: "deepseek-v4-flash", deepDebate: false, responseLength: "short" as const };
    expect(premiumCoinCost(cfg)).toBe(160);
    expect(premiumCoinCost({ ...cfg, responseLength: "long" as const })).toBe(320);
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

  it("uses net revenue from the least valuable pack for economic checks", () => {
    expect(netPackRevenueUsd(COIN_PACKS[2])).toBeCloseTo(17.691, 3);
    expect(netCoinUsd(COIN_PACKS[2])).toBeCloseTo(0.0252729, 6);
    expect(LOWEST_NET_COIN_USD).toBeCloseTo(netCoinUsd(COIN_PACKS[2]), 9);
  });
});
