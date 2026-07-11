import { describe, expect, it } from "vitest";

import { stripEchoedHeading } from "./turnText";

const BODY = "The evidence says otherwise, and here is why.\n\nSecond paragraph.";

describe("stripEchoedHeading", () => {
  it("strips the owner-reported deep-debate titles", () => {
    for (const title of [
      "Opening Arguments — Pro Side",
      "Against Side — Opening Arguments",
      "Rebuttals — Pro Side",
    ]) {
      const label = title.includes("Rebuttals") ? "Rebuttals" : "Opening Arguments";
      expect(stripEchoedHeading(`${title}\n\n${BODY}`, label)).toBe(BODY);
    }
  });

  it("strips markdown-decorated titles (##, **, trailing colon)", () => {
    expect(stripEchoedHeading(`## **Opening Arguments — Pro Side:**\n${BODY}`, "Opening Arguments")).toBe(BODY);
  });

  it("strips a side-only title even without the round label", () => {
    expect(stripEchoedHeading(`Pro Side\n${BODY}`, "Counter-Rebuttals")).toBe(BODY);
  });

  it("keeps a first SENTENCE that mentions the round or side", () => {
    const opener = `The pro side keeps dodging the numbers.\n${BODY}`;
    expect(stripEchoedHeading(opener, "Rebuttals")).toBe(opener);

    const longLine = `Opening arguments about safety usually ignore the base rates that actually matter here, and this one is no different\n${BODY}`;
    expect(stripEchoedHeading(longLine, "Opening Arguments")).toBe(longLine);
  });

  it("keeps unrelated first lines and never returns empty content", () => {
    const plain = `AI harms children more than adults.\n${BODY}`;
    expect(stripEchoedHeading(plain, "Opening Arguments")).toBe(plain);
    expect(stripEchoedHeading("Rebuttals — Pro Side", "Rebuttals")).toBe("Rebuttals — Pro Side");
  });
});
