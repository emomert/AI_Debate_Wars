import { describe, it, expect } from "vitest";
import { parseMove } from "@/lib/debate/parseMove";

describe("parseMove", () => {
  it("parses a colon-tagged move and strips the tag", () => {
    expect(parseMove("OBJECTION: That's a sunk-cost fallacy.")).toEqual({
      move: "OBJECTION",
      content: "That's a sunk-cost fallacy.",
    });
  });

  it("parses a bang-tagged move", () => {
    expect(parseMove("COUNTER! Your own source disagrees.")).toEqual({
      move: "COUNTER",
      content: "Your own source disagrees.",
    });
  });

  it("is case-insensitive on the tag", () => {
    expect(parseMove("receipts - see the 2019 study.").move).toBe("RECEIPTS");
  });

  it("handles the tag on its own line", () => {
    expect(parseMove("FINISHER\nAnd that's the match.")).toEqual({
      move: "FINISHER",
      content: "And that's the match.",
    });
  });

  it("returns null move for an unknown tag and keeps the text", () => {
    expect(parseMove("REBUTTAL: not a real tag")).toEqual({
      move: null,
      content: "REBUTTAL: not a real tag",
    });
  });

  it("returns null move when there is no tag", () => {
    expect(parseMove("Just a plain sentence.")).toEqual({
      move: null,
      content: "Just a plain sentence.",
    });
  });

  it("does not treat a mid-sentence keyword as a move", () => {
    expect(parseMove("I object to the framing here.").move).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(parseMove("  TOUCHE:  fair point.  ")).toEqual({
      move: "TOUCHE",
      content: "fair point.",
    });
  });
});
