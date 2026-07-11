import { afterEach, describe, expect, it, vi } from "vitest";

// rateLimit.ts imports "server-only" (throws outside a server bundle) and the
// Supabase server client. Stub both so we can exercise the in-process backstop
// that runs when Supabase is unavailable. getSupabaseServerClient → null makes
// every call take the Supabase-absent fallback path.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => null,
}));

/**
 * Load a fresh copy of the module with the given env. The rate/spend limits are
 * read from process.env at module-eval time, and the in-process backstop maps
 * are module-level — so resetModules per test gives both fresh config AND
 * isolated counters.
 */
async function freshModule(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("./rateLimit");
}

/** A Request carrying a fixed client IP (drives the per-IP bucket). */
function reqFrom(ip: string): Request {
  return new Request("https://example.test/api", { headers: { "x-real-ip": ip } });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("in-process backstop (Supabase unavailable)", () => {
  it("rate-limits a single IP once the per-window cap is exceeded", async () => {
    const { enforceLimits } = await freshModule({
      RL_TOPIC_PER_MIN: "3",
      RL_WINDOW_SECONDS: "60",
    });
    const req = reqFrom("10.0.0.1");

    // First 3 (the cap) pass; the 4th trips the limiter.
    await expect(enforceLimits(req, "topic")).resolves.toBeUndefined();
    await expect(enforceLimits(req, "topic")).resolves.toBeUndefined();
    await expect(enforceLimits(req, "topic")).resolves.toBeUndefined();
    await expect(enforceLimits(req, "topic")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("keeps separate buckets per IP", async () => {
    const { enforceLimits } = await freshModule({ RL_TOPIC_PER_MIN: "1" });
    const a = reqFrom("10.0.0.2");
    const b = reqFrom("10.0.0.3");

    await expect(enforceLimits(a, "topic")).resolves.toBeUndefined();
    await expect(enforceLimits(a, "topic")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    // b is untouched by a's flood.
    await expect(enforceLimits(b, "topic")).resolves.toBeUndefined();
  });

  it("blocks a paid route once recorded spend passes the per-IP daily cap", async () => {
    const { enforceLimits, recordSpend } = await freshModule({
      RL_TURN_PER_MIN: "1000", // keep the rate cap out of the way
      SPEND_IP_DAILY_USD: "1",
      SPEND_GLOBAL_DAILY_USD: "1000",
    });
    const req = reqFrom("10.0.0.4");

    await expect(enforceLimits(req, "turn")).resolves.toBeUndefined();
    await recordSpend(req, 1.5); // meets the $1 per-IP cap
    await expect(enforceLimits(req, "turn")).rejects.toMatchObject({
      code: "DAILY_LIMIT_REACHED",
    });
  });

  it("does not apply the spend cap to DB-only community routes", async () => {
    const { enforceLimits, recordSpend } = await freshModule({
      RL_PUBLISH_PER_MIN: "1000",
      SPEND_GLOBAL_DAILY_USD: "0.0001",
    });
    const req = reqFrom("10.0.0.5");
    await recordSpend(req, 5); // blow past the global cap
    // publish isn't a PAID_KIND, so spend never gates it.
    await expect(enforceLimits(req, "publish")).resolves.toBeUndefined();
  });

  it("caps the global web-search budget", async () => {
    const { enforceSearchBudget } = await freshModule({ SEARCH_DAILY_MAX: "2" });
    await expect(enforceSearchBudget()).resolves.toBeUndefined();
    await expect(enforceSearchBudget()).resolves.toBeUndefined();
    await expect(enforceSearchBudget()).rejects.toMatchObject({
      code: "DAILY_LIMIT_REACHED",
    });
  });
});
