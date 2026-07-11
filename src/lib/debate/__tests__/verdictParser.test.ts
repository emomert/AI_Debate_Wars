import { describe, expect, it } from "vitest";

import { parseVerdict } from "@/lib/debate/verdictParser";

describe("parseVerdict — strict JSON", () => {
  it("parses a complete verdict", () => {
    const raw = JSON.stringify({
      winner: "modelA",
      winnerArgument: "The decisive point.",
      reasoning: "Debater A **won** on evidence.",
      scoreModelA: 62,
      scoreModelB: 38,
    });
    const v = parseVerdict(raw, "debate", "Grok 4.5", "Gemini 3.5 Flash");
    expect(v.winner).toBe("modelA");
    expect(v.scoreModelA).toBe(62);
    expect(v.scoreModelB).toBe(38);
    expect(v.summary).toContain("**won**");
    expect(v.winnerArgument).toBe("The decisive point.");
  });
});

describe("parseVerdict — truncated JSON (reasoning-model cutoff)", () => {
  // The exact failure the owner hit with MiMo as judge: output cut off
  // mid-"reasoning", so strict JSON.parse fails.
  const truncated =
    `{ "winner": "modelB", "winnerArgument": "The physics of carbon dioxide ` +
    `are not a 'funding racket'; they are fundamental chemistry established ` +
    `in the 19th century.", "reasoning": "Debater B won by grounding their ` +
    `arguments in established scientific principles and **effec`;

  it("salvages the winner and never renders raw JSON as the summary", () => {
    const v = parseVerdict(truncated, "debate", "Grok 4.5", "Gemini 3.5 Flash");
    expect(v.winner).toBe("modelB");
    // The summary must be the salvaged reasoning text, not the JSON blob.
    expect(v.summary).not.toContain("{");
    expect(v.summary).not.toContain('"winner"');
    expect(v.summary).toContain("established scientific principles");
    // Cut-off tail ("and **effec") is trimmed back to the last full sentence.
    expect(v.summary).not.toContain("effec");
    // Winner argument survived intact (its closing quote made it out).
    expect(v.winnerArgument).toContain("fundamental chemistry");
  });

  it("keeps the score bars consistent with the salvaged winner", () => {
    const v = parseVerdict(truncated, "debate", "Grok 4.5", "Gemini 3.5 Flash");
    // No scores made it out before the cutoff → reconciled toward the winner.
    expect(v.scoreModelB).toBeGreaterThanOrEqual(60);
    expect((v.scoreModelA ?? 0) + (v.scoreModelB ?? 0)).toBe(100);
  });
});

describe("parseVerdict — unusable output", () => {
  it("falls back to a generic line, never the raw text", () => {
    const raw = "I refuse to answer in the requested format.";
    const v = parseVerdict(raw, "debate", "A", "B");
    expect(v.summary).toBe("Verdict delivered.");
    expect(v.winner).toBe("tie"); // 50/50 default
    expect(v.scoreModelA).toBe(50);
  });
});
