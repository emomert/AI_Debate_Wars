import { describe, expect, it } from "vitest";

import { buildMatchShareText } from "./matchText";
import { result as en } from "@/lib/i18n/dictionaries/en/result";
import type { DebateSession } from "@/lib/debate/debateTypes";

function baseSession(over: Partial<DebateSession> = {}): DebateSession {
  return {
    id: "sess-1",
    topic: "Should cities ban cars from their centers?",
    mode: "debate",
    tone: "serious",
    deepDebate: false,
    responseLength: "short",
    roundCount: 3,
    pace: "auto",
    language: "en",
    judge: { enabled: true, mode: "auto" },
    modelA: { providerId: "openai", modelId: "gpt-5.6", displayName: "GPT-5.6", color: "blue" },
    modelB: { providerId: "openrouter", modelId: "x-ai/grok-4.5", displayName: "Grok 4.5", color: "red" },
    turns: [],
    messages: [
      {
        speaker: "modelA",
        roundLabel: "Round 1 · Opening",
        content: "Cars **choke** city centers.",
        status: "complete",
      },
      {
        speaker: "modelB",
        roundLabel: "Round 1 · Opening",
        content: "Bans hurt small businesses.",
        status: "complete",
      },
      { speaker: "modelA", content: "", status: "error" },
      { speaker: "judge", content: "JUDGE NOTES — never shared as a turn", status: "complete" },
    ],
    verdict: {
      judgeModelId: "deepseek-chat",
      winner: "modelA",
      scoreModelA: 62,
      scoreModelB: 38,
      summary: "A carried the **decisive** evidence.",
    },
    costSummary: { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, totalCost: 0, currency: "USD" },
    status: "complete",
    createdAt: "2026-07-11T00:00:00Z",
    updatedAt: "2026-07-11T00:00:00Z",
    ...over,
  } as unknown as DebateSession;
}

const t = en.share.matchText;

describe("buildMatchShareText", () => {
  it("carries topic, sides, every fighter turn and the verdict — no URL", () => {
    const text = buildMatchShareText(
      baseSession(),
      "GPT-5.6 beat Grok 4.5",
      "DeepSeek Chat",
      t,
    );
    expect(text).toContain("GPT-5.6 beat Grok 4.5");
    expect(text).toContain("Topic: Should cities ban cars from their centers?");
    expect(text).toContain("Pro: GPT-5.6");
    expect(text).toContain("Against: Grok 4.5");
    expect(text).toContain("— Round 1 · Opening · GPT-5.6 —");
    expect(text).toContain("Cars choke city centers.");
    expect(text).toContain("Bans hurt small businesses.");
    expect(text).toContain("Judge: DeepSeek Chat");
    expect(text).toContain("A carried the decisive evidence.");
    expect(text).toContain("Winner: GPT-5.6 · Score: 62–38");
    // The giant stateless /s URL made the copied text look broken (owner
    // report) — the text share must stay URL-free.
    expect(text).not.toContain("http");
  });

  it("uses CRLF line breaks so classic Windows paste targets keep the structure", () => {
    const text = buildMatchShareText(baseSession(), "h", "j", t);
    expect(text).toContain("\r\n");
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("strips markdown bold markers and skips judge/errored turns", () => {
    const text = buildMatchShareText(baseSession(), "h", "j", t);
    expect(text).not.toContain("**");
    expect(text).not.toContain("JUDGE NOTES");
  });

  it("handles a verdict-less session", () => {
    const text = buildMatchShareText(baseSession({ verdict: undefined }), "h", "", t);
    expect(text).toContain(t.noJudge);
    expect(text).not.toContain("Winner:");
  });
});
