import { describe, it, expect } from "vitest";
import { BLITZ_BUFFER, canStartPlayback } from "@/lib/debate/blitzBuffer";

describe("blitz buffer", () => {
  it("buffers the configured number of turns before playback", () => {
    expect(BLITZ_BUFFER).toBe(4);
    expect(canStartPlayback(3, 8)).toBe(false);
    expect(canStartPlayback(4, 8)).toBe(true);
    expect(canStartPlayback(8, 8)).toBe(true);
  });

  it("starts immediately when the whole match is shorter than the buffer", () => {
    expect(canStartPlayback(2, 2)).toBe(true);
  });
});
