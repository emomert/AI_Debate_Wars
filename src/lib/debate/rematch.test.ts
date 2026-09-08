import { describe, expect, it } from "vitest";
import { switchSidesConfig } from "./rematch";
import { createDebateSession, createDebateSessions } from "./orchestrator";
import type { DebateConfig } from "./debateTypes";
import { matchCoinCost, judgeCoinCost } from "@/lib/coins/economy";

const config: DebateConfig = {
  topic: "Public libraries should be free",
  mode: "debate", roundCount: 3, responseLength: "short", pace: "manual",
  tone: "custom", customTone: "Use plain language",
  customToneA: "Be humorous", customToneB: "Be analytical", deepDebate: false,
  modelA: { modelId: "gpt-5.4-mini", providerId: "openai", displayName: "GPT-5.4 Mini", color: "blue" },
  modelB: { modelId: "deepseek-v4-flash", providerId: "deepseek", displayName: "DeepSeek V4 Flash", color: "red" },
  judge: { enabled: true, mode: "thirdModel", model: { providerId: "openai", modelId: "gpt-4.1-mini" } },
};

describe("switch sides rematch", () => {
  it("reverses actual generated stances, keeps tones with fighters and leaves the source untouched", () => {
    const source = createDebateSession(config);
    const before = structuredClone(source);
    const reversed = switchSidesConfig(source);
    const [next] = createDebateSessions(reversed);
    expect(next.turns.filter(t => t.modelId === source.modelA.modelId).every(t => t.stance === "against")).toBe(true);
    expect(next.turns.filter(t => t.modelId === source.modelB.modelId).every(t => t.stance === "pro")).toBe(true);
    expect(next.modelA.color).toBe("blue");
    expect(next.modelB.color).toBe("red");
    expect(next.customToneA).toBe(source.customToneB);
    expect(next.customToneB).toBe(source.customToneA);
    expect(next.customTone).toBe(source.customTone);
    expect(next.judge).toEqual(source.judge);
    expect(next.judge).not.toBe(source.judge);
    expect(next.topic).toBe(source.topic);
    expect(next.pace).toBe(source.pace);
    expect(next.id).not.toBe(source.id);
    expect(next.turns.every(t => !source.turns.some(old => old.id === t.id))).toBe(true);
    expect(next.messages).toEqual([]);
    expect(next.verdict).toBeUndefined();
    expect(source).toEqual(before);
    const cost = (c: DebateConfig) => matchCoinCost({ modelAId: c.modelA.modelId, modelBId: c.modelB.modelId, deepDebate: c.deepDebate, responseLength: c.responseLength }) + judgeCoinCost({ mode: c.judge.mode, modelId: c.judge.model?.modelId });
    expect(cost(reversed)).toBe(cost(config));
  });

  it("replays only the selected battle from a multi-battle match", () => {
    const battles = createDebateSessions({ ...config, battles: [{ modelA: config.modelB, modelB: config.modelA }] });
    const reversed = switchSidesConfig(battles[1]);
    const next = createDebateSessions(reversed);
    expect(next).toHaveLength(1);
    expect(next[0].modelA.modelId).toBe(battles[1].modelB.modelId);
    expect(next[0].modelB.modelId).toBe(battles[1].modelA.modelId);
    expect(next[0].matchSetId).not.toBe(battles[1].matchSetId);
  });

  it("keeps Deep Debate but applies the current launch format to legacy sessions", () => {
    const source = createDebateSession({ ...config, mode: "discussion", roundCount: 7, responseLength: "long", deepDebate: true, judge: { enabled: false, mode: "none" } });
    expect(switchSidesConfig(source)).toMatchObject({ mode: "debate", roundCount: 3, responseLength: "short", tone: "serious", deepDebate: true, judge: { enabled: true, mode: "auto" } });
  });
});
