import { describe, it, expect } from "vitest";
import { assertValidSession } from "@/lib/debate/validators";
import { createDebateSession } from "@/lib/debate/orchestrator";
import type { DebateConfig } from "@/lib/debate/debateTypes";

function blitzConfig(overrides: Partial<DebateConfig> = {}): DebateConfig {
  const model = (id: string) => ({
    providerId: "openai",
    modelId: id,
    displayName: id,
    nickname: id,
    color: "blue" as const,
  });
  return {
    topic: "Is pineapple acceptable on pizza?",
    mode: "blitz",
    modelA: model("deepseek-v4-pro"),
    modelB: { ...model("deepseek-v4-flash"), color: "red" },
    roundCount: 3,
    responseLength: "punchy",
    tone: "serious",
    pace: "auto",
    deepDebate: false,
    judge: { enabled: true, mode: "auto" },
    ...overrides,
  } as DebateConfig;
}

describe("blitz validation", () => {
  it("accepts a well-formed blitz session (8 turns)", () => {
    const s = createDebateSession(blitzConfig());
    expect(s.turns).toHaveLength(8);
    expect(() => assertValidSession(s)).not.toThrow();
  });

  it("rejects a blitz session with the wrong turn count", () => {
    const s = createDebateSession(blitzConfig());
    s.turns = s.turns.slice(0, 6);
    expect(() => assertValidSession(s)).toThrow();
  });

  it("rejects blitz with a non-auto pace", () => {
    const s = createDebateSession(blitzConfig());
    s.pace = "manual";
    expect(() => assertValidSession(s)).toThrow();
  });
});
