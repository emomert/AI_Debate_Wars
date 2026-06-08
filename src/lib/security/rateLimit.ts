import "server-only";

/**
 * Cost & abuse protection for the paid debate routes (docs/11). Two guards,
 * enforced in Postgres (Supabase) via atomic SECURITY DEFINER RPCs — see
 * supabase/migrations/0003_rate_limits.sql:
 *
 *  1. Per-IP request RATE LIMIT (fixed window) — stops a flood from hammering
 *     the provider on the owner's keys.
 *  2. Daily SPEND CAP (global + per-IP) — a hard ceiling on how much real money
 *     the public app can burn per day. Free models cost ~$0 so they barely
 *     touch it; paid models (GPT/DeepSeek/Deep Debate search) are what it bounds.
 *
 * FAIL-OPEN by design: if Supabase isn't configured, or an RPC errors, requests
 * are allowed (and logged). A transient DB blip should never take the whole app
 * down — the global cap is the real backstop, and these are best-effort guards,
 * not a security boundary. Production MUST run migration 0003 and configure
 * Supabase for these to take effect.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ProviderError } from "@/lib/utils/errors";

type RouteKind = "turn" | "verdict";

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Conservative launch defaults; override via env without a redeploy of logic.
const WINDOW_SECONDS = num(process.env.RL_WINDOW_SECONDS, 60);
const PER_MIN: Record<RouteKind, number> = {
  turn: num(process.env.RL_TURN_PER_MIN, 8),
  verdict: num(process.env.RL_VERDICT_PER_MIN, 4),
};
const GLOBAL_DAILY_CAP_USD = num(process.env.SPEND_GLOBAL_DAILY_USD, 10);
const IP_DAILY_CAP_USD = num(process.env.SPEND_IP_DAILY_USD, 1);

/** Best-effort client IP from the proxy headers Vercel/most hosts set. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

let warnedUnconfigured = false;

/**
 * Enforce the per-IP rate limit AND the daily spend caps for a paid route.
 * Throws TOO_MANY_REQUESTS / DAILY_LIMIT_REACHED (both HTTP 429, and neither is
 * in the client's silent-retry set) when a guard trips. Call BEFORE doing any
 * paid work.
 */
export async function enforceLimits(req: Request, kind: RouteKind): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    if (!warnedUnconfigured) {
      console.warn(
        "[rate-limit] Supabase not configured — paid routes are UNPROTECTED. " +
          "Configure Supabase + run migration 0003 before a public launch.",
      );
      warnedUnconfigured = true;
    }
    return; // fail-open
  }

  const ip = clientIp(req);

  // 1) Rate limit (fixed window per IP per route).
  try {
    const { data: allowed, error } = await supabase.rpc("rl_hit", {
      p_bucket: `${kind}:ip:${ip}`,
      p_limit: PER_MIN[kind],
      p_window_seconds: WINDOW_SECONDS,
    });
    if (error) {
      console.error("[rate-limit] rl_hit failed (allowing):", error.message);
    } else if (allowed === false) {
      throw new ProviderError("TOO_MANY_REQUESTS", "Request rate limit exceeded");
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    console.error("[rate-limit] rl_hit threw (allowing):", err);
  }

  // 2) Daily spend caps (global + per-IP).
  try {
    const { data: spendOk, error } = await supabase.rpc("spend_allowed", {
      p_ip: ip,
      p_global_cap: GLOBAL_DAILY_CAP_USD,
      p_ip_cap: IP_DAILY_CAP_USD,
    });
    if (error) {
      console.error("[rate-limit] spend_allowed failed (allowing):", error.message);
    } else if (spendOk === false) {
      throw new ProviderError("DAILY_LIMIT_REACHED", "Daily spend cap reached");
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    console.error("[rate-limit] spend_allowed threw (allowing):", err);
  }
}

/**
 * Record the actual USD cost of a completed call against today's global + per-IP
 * ledgers. Call AFTER the provider responds and cost is computed. Best-effort:
 * a failure here never fails the user's request (the turn already succeeded).
 */
export async function recordSpend(req: Request, amountUsd: number): Promise<void> {
  if (!(amountUsd > 0)) return;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  try {
    const { error } = await supabase.rpc("spend_record", {
      p_ip: clientIp(req),
      p_amount: amountUsd,
    });
    if (error) console.error("[rate-limit] spend_record failed:", error.message);
  } catch (err) {
    console.error("[rate-limit] spend_record threw:", err);
  }
}
