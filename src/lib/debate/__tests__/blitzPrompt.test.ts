import { describe, it, expect } from "vitest";
import { lengthPreset, buildSystemPrompt } from "@/lib/debate/promptBuilder";

describe("blitz prompt pieces", () => {
  it("punchy length preset is short-capped", () => {
    const p = lengthPreset("punchy");
    expect(p.maxTokens).toBeLessThanOrEqual(120);
    expect(p.description.toLowerCase()).toContain("word");
  });

  it("blitz system prompt instructs a leading move tag and lists the enum", () => {
    const sys = buildSystemPrompt("blitz", false, true, "en");
    expect(sys).toContain("OBJECTION");
    expect(sys).toContain("FINISHER");
    expect(sys.toLowerCase()).toContain("begin");
  });

  it("non-blitz system prompt does NOT add the move-tag instruction", () => {
    const sys = buildSystemPrompt("debate", false, true, "en");
    expect(sys).not.toContain("FINISHER");
  });
});
