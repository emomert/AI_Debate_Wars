import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Signed-in but NOT an admin.
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "not-admin" } } }) },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseServiceRoleClient: () => null }));

import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/admin/analytics", () => {
  it("returns 404 for a non-admin user (does not reveal the route exists)", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "the-owner");
    const res = await GET(new Request("https://x.test/api/admin/analytics"));
    expect(res.status).toBe(404);
  });
});
