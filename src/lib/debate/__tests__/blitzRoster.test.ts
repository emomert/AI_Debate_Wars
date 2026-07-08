import { describe, it, expect } from "vitest";
import { BLITZ_ROSTER, isBlitzModel, blitzRosterModelIds } from "@/lib/debate/blitzRoster";
import { getModelById } from "@/lib/models/modelRegistry";

describe("blitz roster", () => {
  it("every roster entry references a real catalog model", () => {
    for (const f of BLITZ_ROSTER) {
      expect(getModelById(f.modelId), `${f.modelId} must exist in the catalog`).toBeTruthy();
    }
  });

  it("isBlitzModel is true only for available roster ids", () => {
    const first = blitzRosterModelIds()[0];
    expect(isBlitzModel(first)).toBe(true);
    expect(isBlitzModel("definitely-not-a-model")).toBe(false);
  });

  it("exposes at least two available fighters (a match needs two)", () => {
    expect(blitzRosterModelIds().length).toBeGreaterThanOrEqual(2);
  });
});
