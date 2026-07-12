import { describe, expect, it } from "vitest";

import {
  judgeChargeKey,
  matchChargeKey,
  matchContentFingerprint,
  transcriptFingerprint,
} from "./chargeKey";

const SECRET = "test-secret-not-a-real-key";
const match = {
  topic: "Is cereal a soup?",
  modelAId: "gpt-5.4-mini",
  modelBId: "deepseek-v4-flash",
  responseLength: "short",
  deepDebate: false,
  roundCount: 3,
};

describe("matchContentFingerprint", () => {
  it("is deterministic for identical input", () => {
    expect(matchContentFingerprint(match)).toBe(matchContentFingerprint({ ...match }));
  });

  it("changes when any match-defining field changes", () => {
    const base = matchContentFingerprint(match);
    expect(matchContentFingerprint({ ...match, topic: "other" })).not.toBe(base);
    expect(matchContentFingerprint({ ...match, modelAId: "gpt-4o" })).not.toBe(base);
    expect(matchContentFingerprint({ ...match, modelBId: "gpt-4o" })).not.toBe(base);
    expect(matchContentFingerprint({ ...match, responseLength: "long" })).not.toBe(base);
    expect(matchContentFingerprint({ ...match, deepDebate: true })).not.toBe(base);
    expect(matchContentFingerprint({ ...match, roundCount: 5 })).not.toBe(base);
  });
});

describe("transcriptFingerprint", () => {
  it("changes when the transcript changes", () => {
    const a = transcriptFingerprint([{ speaker: "A", content: "hi" }]);
    const b = transcriptFingerprint([{ speaker: "A", content: "bye" }]);
    expect(a).not.toBe(b);
  });
});

describe("matchChargeKey", () => {
  const fp = matchContentFingerprint(match);

  it("keeps the human-readable session:total prefix", () => {
    expect(matchChargeKey(SECRET, "sess-1", 2, fp)).toMatch(/^sess-1:2c:[0-9a-f]{24}$/);
  });

  it("is deterministic for identical inputs (idempotent retries stay one charge)", () => {
    expect(matchChargeKey(SECRET, "sess-1", 2, fp)).toBe(matchChargeKey(SECRET, "sess-1", 2, fp));
  });

  it("differs for different match content, even with the same session id + total (replay is blocked)", () => {
    const other = matchContentFingerprint({ ...match, topic: "different match" });
    expect(matchChargeKey(SECRET, "sess-1", 2, fp)).not.toBe(matchChargeKey(SECRET, "sess-1", 2, other));
  });

  it("is unforgeable without the secret (a hostile client cannot pre-compute a real key)", () => {
    expect(matchChargeKey(SECRET, "sess-1", 2, fp)).not.toBe(
      matchChargeKey("attacker-guess", "sess-1", 2, fp),
    );
  });
});

describe("judgeChargeKey", () => {
  const tfp = transcriptFingerprint([{ speaker: "A", content: "x" }]);

  it("is stable per (session, judge, transcript) but changes when the judge switches", () => {
    expect(judgeChargeKey(SECRET, "sess-1", "gpt-5.5", tfp)).toBe(
      judgeChargeKey(SECRET, "sess-1", "gpt-5.5", tfp),
    );
    expect(judgeChargeKey(SECRET, "sess-1", "gpt-5.5", tfp)).not.toBe(
      judgeChargeKey(SECRET, "sess-1", "anthropic/claude-fable-5", tfp),
    );
  });

  it("is unforgeable without the secret", () => {
    expect(judgeChargeKey(SECRET, "sess-1", "gpt-5.5", tfp)).not.toBe(
      judgeChargeKey("attacker-guess", "sess-1", "gpt-5.5", tfp),
    );
  });
});
