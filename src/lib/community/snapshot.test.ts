import { describe, expect, it } from "vitest";

import { buildSharedSnapshot } from "./snapshot";
import type { DebateSession } from "@/lib/debate/debateTypes";
import type { PublishOptions } from "@/lib/community/types";

const OPTIONS: PublishOptions = {
  visibility: "public",
  showModels: true,
  includeVerdict: false,
};

/** Minimal session with one completed fighter turn carrying mixed citations. */
function sessionWithCitations(): DebateSession {
  const model = {
    providerId: "openrouter",
    modelId: "anthropic/claude-sonnet-5",
    displayName: "Sonnet 5",
    color: "blue",
  };
  return {
    id: "s1",
    topic: "Should cities ban cars?",
    mode: "debate",
    roundCount: 3,
    deepDebate: true,
    modelA: model,
    modelB: { ...model, modelId: "x-ai/grok-4.5", displayName: "Grok 4.5", color: "red" },
    messages: [
      {
        id: "m1",
        sessionId: "s1",
        turnId: "t1",
        speaker: "modelA",
        providerId: "openrouter",
        modelId: "anthropic/claude-sonnet-5",
        role: "for",
        stance: "for",
        roundLabel: "Round 1",
        content: "Cars choke cities [1][2].",
        status: "complete",
        createdAt: "2026-07-11T00:00:00Z",
        citations: [
          { index: 1, title: "Real source", url: "https://example.com/study" },
          { index: 2, title: "Evil", url: "javascript:alert(document.cookie)" },
          { index: 3, title: "Data URI", url: "data:text/html,<script>1</script>" },
        ],
      },
    ],
  } as unknown as DebateSession;
}

describe("buildSharedSnapshot citation sanitizing", () => {
  it("keeps only http(s) citation URLs in the stored snapshot", () => {
    const snap = buildSharedSnapshot(sessionWithCitations(), OPTIONS);
    const citations = snap.messages[0]?.citations ?? [];
    expect(citations).toHaveLength(1);
    expect(citations[0]?.url).toBe("https://example.com/study");
    // No hostile scheme survives into the public snapshot.
    expect(citations.some((c) => c.url.startsWith("javascript:"))).toBe(false);
    expect(citations.some((c) => c.url.startsWith("data:"))).toBe(false);
  });

  it("omits the citations field entirely when none are safe", () => {
    const session = sessionWithCitations();
    session.messages[0].citations = [
      { index: 1, title: "x", url: "javascript:alert(1)" },
    ];
    const snap = buildSharedSnapshot(session, OPTIONS);
    expect(snap.messages[0]?.citations).toBeUndefined();
  });
});
