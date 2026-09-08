import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseServiceRoleClient: () => mocks.db }));
import { withSpendBudget, reserveSpend, completionReservationUsd } from "./spendBudget";
const req = (ip: string) => new Request("https://example.test", { headers: { "x-real-ip": ip } });
beforeEach(() => { mocks.db = null; vi.stubEnv("NODE_ENV", "development"); });
afterEach(() => vi.unstubAllEnvs());

describe("per-attempt reservations", () => {
  it("fails closed before a paid call when production storage is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(withSpendBudget(req("prod"), () => reserveSpend(0.01))).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
  it("requires request context outside isolated provider tests", async () => {
    await expect(reserveSpend(0.01)).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
  it("books concurrent attempts before work; an unknown outcome stays booked", async () => {
    vi.stubEnv("SPEND_IP_DAILY_USD", "1");
    await withSpendBudget(req("concurrent"), async () => {
      const results = await Promise.allSettled([reserveSpend(0.6), reserveSpend(0.6)]);
      expect(results.map(r => r.status).sort()).toEqual(["fulfilled", "rejected"]);
      const booked = results.find(r => r.status === "fulfilled")!;
      if (booked.status === "fulfilled") await booked.value();
      await expect(reserveSpend(0.5)).rejects.toMatchObject({ code: "DAILY_LIMIT_REACHED" });
    });
  });
  it("reconciles known usage once, freeing only the unused portion", async () => {
    vi.stubEnv("SPEND_IP_DAILY_USD", "1");
    await withSpendBudget(req("settle"), async () => {
      const settle = await reserveSpend(0.8);
      await settle(0.2); await settle(0);
      await expect(reserveSpend(0.8)).resolves.toBeTypeOf("function");
      await expect(reserveSpend(0.01)).rejects.toMatchObject({ code: "DAILY_LIMIT_REACHED" });
    });
  });
  it("does not replace a failed distributed reservation with local allowance", async () => {
    mocks.db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "offline" } }) };
    await expect(withSpendBudget(req("outage"), () => reserveSpend(0.1))).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
  it("uses cache-write pricing and maximum completion tokens in the reservation", () => {
    const amount = completionReservationUsd("openai", "gpt-6-astra", "hello", 8192);
    expect(amount).toBeGreaterThan(8192 * 50 / 1e6);
    expect(() => completionReservationUsd("openrouter", "some/model:online", "hello", 100)).toThrow();
  });
});
