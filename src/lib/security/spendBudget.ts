import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { clientIp } from "./rateLimit";
import { ProviderError } from "@/lib/utils/errors";
import { getModelPrice } from "@/lib/cost/pricing";

const context = new AsyncLocalStorage<{ ip: string; reservations: number }>();
export function withSpendBudget<T>(req: Request, work: () => Promise<T>): Promise<T> {
  return context.run({ ip: clientIp(req), reservations: 0 }, work);
}
export function hasReservedSpend(): boolean { return (context.getStore()?.reservations ?? 0) > 0; }
const localSpend = new Map<string, number>();
let localDay = "";
function cap(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 100000) {
    throw new ProviderError("PROVIDER_ERROR", "Invalid spend cap configuration");
  }
  return parsed;
}

/** Deliberately overestimates input: UTF-8 bytes, message overhead, no cache discount. */
export function completionReservationUsd(provider: string, model: string, prompt: string, maxOutput: number): number {
  if (model.endsWith(":online")) throw new ProviderError("INVALID_REQUEST", "Use app-managed search for metered generation");
  const price = getModelPrice(provider, model);
  const input = Buffer.byteLength(prompt, "utf8") + 256;
  return Math.max(0.000001, (input * Math.max(price.inputCostPer1M, price.cacheWriteInputCostPer1M ?? 0) +
    maxOutput * price.outputCostPer1M) / 1_000_000);
}

/** Reserve BEFORE every actual provider/search attempt, including internal retries.
 * Unknown outcomes keep the full booking: timeout/disconnect is not a refund.
 * Settlement failures also retain the booking, rather than failing a completed answer.
 */
export async function reserveSpend(amount: number): Promise<(actual?: number) => Promise<void>> {
  const requestBudget = context.getStore();
  if (!requestBudget) {
    if (process.env.NODE_ENV === "test") return async () => {};
    throw new ProviderError("PROVIDER_ERROR", "Paid call has no request budget");
  }
  const ip = requestBudget.ip;
  if (!Number.isFinite(amount) || amount <= 0) throw new ProviderError("PROVIDER_ERROR", "Invalid spend estimate");
  const globalCap = cap(process.env.SPEND_GLOBAL_DAILY_USD, 15);
  const ipCap = cap(process.env.SPEND_IP_DAILY_USD, 3);
  const id = randomUUID();
  const db = getSupabaseServiceRoleClient();
  let settled = false;
  if (!db) {
    if (process.env.NODE_ENV === "production") throw new ProviderError("PROVIDER_ERROR", "Spend storage unavailable");
    const day = new Date().toISOString().slice(0, 10);
    if (day !== localDay) { localSpend.clear(); localDay = day; }
    const scopes = ["global", `ip:${ip}`];
    if ((localSpend.get(scopes[0]!) ?? 0) + amount > globalCap || (localSpend.get(scopes[1]!) ?? 0) + amount > ipCap) {
      throw new ProviderError("DAILY_LIMIT_REACHED");
    }
    if (localSpend.size > 50000 && !localSpend.has(scopes[1]!)) throw new ProviderError("DAILY_LIMIT_REACHED");
    for (const scope of scopes) localSpend.set(scope, (localSpend.get(scope) ?? 0) + amount);
    requestBudget.reservations++;
    return async actual => {
      if (settled || actual === undefined || !Number.isFinite(actual) || actual < 0) return;
      settled = true;
      if (localDay !== day) return;
      for (const scope of scopes) localSpend.set(scope, Math.max(0, (localSpend.get(scope) ?? 0) + actual - amount));
    };
  }
  const { data, error } = await db.rpc("spend_reserve", {
    p_id: id, p_ip: ip, p_amount: amount, p_global_cap: globalCap, p_ip_cap: ipCap,
  });
  if (error || typeof data !== "boolean") throw new ProviderError("PROVIDER_ERROR", "Spend reservation unavailable");
  if (!data) throw new ProviderError("DAILY_LIMIT_REACHED");
  requestBudget.reservations++;
  return async actual => {
    if (settled || actual === undefined || !Number.isFinite(actual) || actual < 0) return;
    settled = true;
    try {
      const result = await db.rpc("spend_settle", { p_id: id, p_actual: actual });
      if (result.error || result.data !== true) console.error("[spend] Settlement unavailable; reservation retained");
    } catch { console.error("[spend] Settlement unavailable; reservation retained"); }
  };
}
