import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseServiceRoleClient: () => null }));

import { recordApiError } from "./errorLog";
import { ProviderError } from "@/lib/utils/errors";

describe("recordApiError", () => {
  it("no-ops and never throws when the service-role key is unconfigured", async () => {
    await expect(
      recordApiError("turn", new ProviderError("PROVIDER_TIMEOUT", "too slow"), {
        modelId: "qwen/qwen3.7-max",
      }),
    ).resolves.toBeUndefined();
  });

  it("tolerates arbitrary non-Error values", async () => {
    await expect(recordApiError("tts", "boom")).resolves.toBeUndefined();
  });
});
