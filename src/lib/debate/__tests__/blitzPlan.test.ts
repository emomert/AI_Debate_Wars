import { describe, it, expect } from "vitest";
import { getRoundPlan } from "@/lib/debate/roundPlans";
import { MODE_OPTIONS } from "@/lib/constants";

describe("blitz round plan", () => {
  it("has exactly 4 rounds regardless of roundCount", () => {
    expect(getRoundPlan("blitz", 3, "en")).toHaveLength(4);
    expect(getRoundPlan("blitz", 7, "en")).toHaveLength(4);
  });

  it("uses the Blitz round labels in order", () => {
    const labels = getRoundPlan("blitz", 3, "en").map((r) => r.label);
    expect(labels).toEqual(["Opening Shot", "Cross-Fire", "Counter-Fire", "Final Blow"]);
  });

  it("has both fighter tasks on every round", () => {
    for (const r of getRoundPlan("blitz", 3, "en")) {
      expect(r.modelATask.length).toBeGreaterThan(0);
      expect(r.modelBTask.length).toBeGreaterThan(0);
    }
  });

  it("registers a blitz mode option so roles resolve", () => {
    expect(MODE_OPTIONS.find((m) => m.id === "blitz")).toBeTruthy();
  });
});
