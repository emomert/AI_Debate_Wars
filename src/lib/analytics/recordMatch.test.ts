import { describe, expect, it, vi } from "vitest";

// server-only guard + both supabase clients stubbed. Service-role → null makes
// recordMatchAnalytics take the "unconfigured" path (no-op, never throws).
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseServiceRoleClient: () => null }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => null }));

import { recordMatchAnalytics } from "./recordMatch";
import type { DebateSession } from "@/lib/debate/debateTypes";

const session = {
  id: "s1",
  mode: "debate",
  tone: "serious",
  deepDebate: false,
  responseLength: "short",
  roundCount: 3,
  pace: "auto",
  judge: { enabled: true, mode: "auto" },
  modelA: { modelId: "a", displayName: "A", providerId: "openrouter", color: "blue" },
  modelB: { modelId: "b", displayName: "B", providerId: "openrouter", color: "red" },
  costSummary: { totalCost: 0.01, currency: "USD", totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0 },
} as unknown as DebateSession;

describe("recordMatchAnalytics", () => {
  it("no-ops and never throws when the service-role key is unconfigured", async () => {
    await expect(
      recordMatchAnalytics(session, { judgeModelId: "j", verdictCost: 0.002, winner: "modelA", scoreA: 60, scoreB: 40 }),
    ).resolves.toBeUndefined();
  });
});
