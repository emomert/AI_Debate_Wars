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

type RouteKind = "turn" | "verdict" | "topic" | "tts" | "publish" | "vote" | "comment";

// Spend caps only make sense for routes that call a paid provider; community
// writes (publish/vote/comment) are DB-only and skip the spend check — a maxed
// daily budget must never block sharing a finished match.
const PAID_KINDS: ReadonlySet<RouteKind> = new Set(["turn", "verdict", "topic", "tts"]);

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Conservative launch defaults; override via env without a redeploy of logic.
// Per-minute turn/verdict caps are sized for MULTI-BATTLE matches (up to 3
// battles run concurrently, so a single match can fire ~3× the turn/verdict
// requests of a single debate). Tune down via env if abuse becomes a problem.
const WINDOW_SECONDS = num(process.env.RL_WINDOW_SECONDS, 60);
const PER_MIN: Record<RouteKind, number> = {
  // 3 battles in auto pace, each with fast/short turns, can burst well past a
  // 3×-of-8 cap; a tripped per-IP turn cap throws TOO_MANY_REQUESTS, which is
  // deliberately NOT client-retried, so it would HARD-CRASH a battle mid-match.
  // Size for the realistic 3-battle ceiling instead (still flood-proof; the
  // daily spend cap is the real money backstop).
  turn: num(process.env.RL_TURN_PER_MIN, 60),
  verdict: num(process.env.RL_VERDICT_PER_MIN, 24),
  // Topic checks are cheap + fast, so a more generous cap (still flood-proof).
  topic: num(process.env.RL_TOPIC_PER_MIN, 12),
  // Voice synthesis (~$0.001/turn): generous enough for auto-read + replays.
  // Only the watched battle ever voices, so multi-battle doesn't raise this.
  tts: num(process.env.RL_TTS_PER_MIN, 20),
  // Community writes (DB-only, but still spam-prone):
  publish: num(process.env.RL_PUBLISH_PER_MIN, 4),
  vote: num(process.env.RL_VOTE_PER_MIN, 20),
  comment: num(process.env.RL_COMMENT_PER_MIN, 6),
};
// Daily spend caps: a 3-battle match can cost ~3× a single debate, so the per-IP
// cap is raised so one multi-battle match can't trip it mid-way.
const GLOBAL_DAILY_CAP_USD = num(process.env.SPEND_GLOBAL_DAILY_USD, 15);
const IP_DAILY_CAP_USD = num(process.env.SPEND_IP_DAILY_USD, 3);

/**
 * Trusted client IP for the per-IP guards.
 *
 * The LEFTMOST `x-forwarded-for` entry is CLIENT-SUPPLIED and trivially spoofable
 * — sending `X-Forwarded-For: <random>` would mint a fresh identity per request
 * and dodge both the per-IP rate limit and the per-IP spend cap. So we prefer the
 * headers the PLATFORM sets and the client cannot overwrite: Vercel injects
 * `x-vercel-forwarded-for` (and `x-real-ip`) with the real TCP peer on every
 * request, discarding any inbound copy. Only when neither is present (e.g. local
 * dev with no proxy) do we fall back to the legacy `x-forwarded-for` parse.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "unknown";
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

  // 2) Daily spend caps (global + per-IP) — paid provider routes only.
  if (!PAID_KINDS.has(kind)) return;
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
