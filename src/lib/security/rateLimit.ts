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
 * FAIL-SOFT, not fail-open: Supabase (migration 0003) is the real, cross-instance
 * guard. When it's unconfigured or an RPC errors, we no longer allow the request
 * unconditionally — we fall back to an IN-PROCESS backstop (per-instance
 * fixed-window rate limit + daily spend/search ledger). That backstop can't hard
 * fail the app (a DB blip never takes it down) but it bounds a single-origin
 * flood instead of leaving paid routes completely uncapped. It's best-effort:
 * serverless runs many short-lived instances, so the effective ceiling is
 * roughly limit × instances — far better than "unbounded", not a substitute for
 * running migration 0003 in production.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ProviderError } from "@/lib/utils/errors";

type RouteKind =
  | "turn"
  | "verdict"
  | "topic"
  | "tts"
  | "publish"
  | "vote"
  | "comment"
  | "report"
  | "og";

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
  report: num(process.env.RL_REPORT_PER_MIN, 6),
  // OG images: no provider spend, but each cache-miss render costs Satori
  // compute. Generous — social crawlers legitimately burst when a link is
  // shared widely, and the CDN cache absorbs repeats of the same payload; this
  // only stops one IP from iterating unbounded DISTINCT payloads.
  og: num(process.env.RL_OG_PER_MIN, 30),
};
// Daily spend caps: a 3-battle match can cost ~3× a single debate, so the per-IP
// cap is raised so one multi-battle match can't trip it mid-way.
const GLOBAL_DAILY_CAP_USD = num(process.env.SPEND_GLOBAL_DAILY_USD, 15);
const IP_DAILY_CAP_USD = num(process.env.SPEND_IP_DAILY_USD, 3);

// Hard global daily cap on injected web-search (Brave) QUERIES — a count-based
// backstop independent of the dollar caps. Brave killed its free tier (Feb 2026):
// ~$5/1k queries with NO overage cap by default, so an unbounded burst of Deep
// Debate searches is its own runaway-cost risk. ~2000/day ≈ $10/day ceiling.
const SEARCH_DAILY_CAP = num(process.env.SEARCH_DAILY_MAX, 2000);
const DAY_SECONDS = 86_400;

// ── In-process backstop (used only when Supabase is unavailable/erroring) ─────
// The Supabase RPCs above are authoritative and shared across instances. These
// per-process maps are the fallback so the fail path bounds abuse instead of
// allowing everything. They reset on cold start and are not shared between
// instances — deliberately simple; the goal is a floor, not a distributed
// limiter. Bounded in size by opportunistic pruning of expired entries.
interface MemWindow {
  windowStart: number; // ms, start of the fixed window
  count: number;
}
const memRateBuckets = new Map<string, MemWindow>();
// day (UTC epoch-day) → scope ('global' | 'ip:<addr>') → USD spent that day.
interface MemSpend {
  day: number;
  usd: number;
}
const memSpend = new Map<string, MemSpend>();
const MEM_MAX_BUCKETS = 50_000; // hard cap so a spoofed-IP flood can't OOM us

const epochDay = (): number => Math.floor(Date.now() / (DAY_SECONDS * 1000));

/** Drop rate buckets whose window has passed and spend rows from earlier days. */
function pruneMem(nowMs: number, today: number): void {
  for (const [key, w] of memRateBuckets) {
    // A window is stale once we're past its end; window length is encoded by the
    // caller, so approximate with "older than a day" for the search bucket and
    // exact for the rest via re-derivation on hit. Cheap heuristic: prune any
    // window that started more than a day ago (covers every kind we use).
    if (nowMs - w.windowStart > DAY_SECONDS * 1000) memRateBuckets.delete(key);
  }
  for (const [key, s] of memSpend) {
    if (s.day !== today) memSpend.delete(key);
  }
}

/** In-process fixed-window hit. Returns true when still under the limit. */
function memRateHit(bucket: string, limit: number, windowSeconds: number): boolean {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(nowMs / windowMs) * windowMs;
  const cur = memRateBuckets.get(bucket);
  if (!cur || cur.windowStart !== windowStart) {
    memRateBuckets.set(bucket, { windowStart, count: 1 });
    // Opportunistic cleanup so the maps don't grow without bound.
    if (memRateBuckets.size > MEM_MAX_BUCKETS) pruneMem(nowMs, epochDay());
    return 1 <= limit;
  }
  cur.count += 1;
  return cur.count <= limit;
}

/** In-process daily spend check (per-instance view of global + per-IP). */
function memSpendAllowed(ip: string, globalCap: number, ipCap: number): boolean {
  const today = epochDay();
  const g = memSpend.get("global");
  const i = memSpend.get(`ip:${ip}`);
  const gUsd = g && g.day === today ? g.usd : 0;
  const iUsd = i && i.day === today ? i.usd : 0;
  return gUsd < globalCap && iUsd < ipCap;
}

/** Add a completed call's cost to the in-process ledgers (best-effort). */
function memSpendRecord(ip: string, amount: number): void {
  if (!(amount > 0)) return;
  const today = epochDay();
  for (const scope of ["global", `ip:${ip}`]) {
    const cur = memSpend.get(scope);
    if (!cur || cur.day !== today) memSpend.set(scope, { day: today, usd: amount });
    else cur.usd += amount;
  }
}

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
  const ip = clientIp(req);
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    if (!warnedUnconfigured) {
      console.warn(
        "[rate-limit] Supabase not configured — falling back to the in-process " +
          "backstop. Configure Supabase + run migration 0003 for the real " +
          "cross-instance caps before a public launch.",
      );
      warnedUnconfigured = true;
    }
    enforceLimitsInMemory(ip, kind); // per-instance backstop, not fail-open
    return;
  }

  // 1) Rate limit (fixed window per IP per route). On any Supabase failure, fall
  //    back to the in-process limiter rather than allowing the request through.
  try {
    const { data: allowed, error } = await supabase.rpc("rl_hit", {
      p_bucket: `${kind}:ip:${ip}`,
      p_limit: PER_MIN[kind],
      p_window_seconds: WINDOW_SECONDS,
    });
    if (error) {
      console.error("[rate-limit] rl_hit failed (backstop):", error.message);
      memEnforceRate(ip, kind);
    } else if (allowed === false) {
      throw new ProviderError("TOO_MANY_REQUESTS", "Request rate limit exceeded");
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    console.error("[rate-limit] rl_hit threw (backstop):", err);
    memEnforceRate(ip, kind);
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
      console.error("[rate-limit] spend_allowed failed (backstop):", error.message);
      memEnforceSpend(ip);
    } else if (spendOk === false) {
      throw new ProviderError("DAILY_LIMIT_REACHED", "Daily spend cap reached");
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    console.error("[rate-limit] spend_allowed threw (backstop):", err);
    memEnforceSpend(ip);
  }
}

/** Backstop rate check → throws TOO_MANY_REQUESTS when the per-instance cap trips. */
function memEnforceRate(ip: string, kind: RouteKind): void {
  if (!memRateHit(`${kind}:ip:${ip}`, PER_MIN[kind], WINDOW_SECONDS)) {
    throw new ProviderError("TOO_MANY_REQUESTS", "Request rate limit exceeded");
  }
}

/** Backstop spend check → throws DAILY_LIMIT_REACHED when the per-instance cap trips. */
function memEnforceSpend(ip: string): void {
  if (!memSpendAllowed(ip, GLOBAL_DAILY_CAP_USD, IP_DAILY_CAP_USD)) {
    throw new ProviderError("DAILY_LIMIT_REACHED", "Daily spend cap reached");
  }
}

/** Full backstop (rate + spend) for the Supabase-absent path. */
function enforceLimitsInMemory(ip: string, kind: RouteKind): void {
  memEnforceRate(ip, kind);
  if (PAID_KINDS.has(kind)) memEnforceSpend(ip);
}

/**
 * Hard global daily cap on injected web-search (Brave) queries — a COUNT-based
 * backstop that sits alongside (not inside) the dollar spend caps. Reuses the
 * same atomic fixed-window RPC with a 1-day window, so no extra schema is needed.
 * Call right BEFORE issuing a search. Throws DAILY_LIMIT_REACHED when tripped;
 * fail-open like the other guards (a DB blip never blocks a search).
 */
export async function enforceSearchBudget(): Promise<void> {
  const memCheck = () => {
    if (!memRateHit("search:global", SEARCH_DAILY_CAP, DAY_SECONDS)) {
      throw new ProviderError("DAILY_LIMIT_REACHED", "Daily web-search budget reached");
    }
  };
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    memCheck(); // backstop instead of fail-open
    return;
  }
  try {
    const { data: allowed, error } = await supabase.rpc("rl_hit", {
      p_bucket: "search:global",
      p_limit: SEARCH_DAILY_CAP,
      p_window_seconds: DAY_SECONDS,
    });
    if (error) {
      console.error("[rate-limit] search rl_hit failed (backstop):", error.message);
      memCheck();
    } else if (allowed === false) {
      throw new ProviderError("DAILY_LIMIT_REACHED", "Daily web-search budget reached");
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    console.error("[rate-limit] search rl_hit threw (backstop):", err);
    memCheck();
  }
}

/**
 * Record the actual USD cost of a completed call against today's global + per-IP
 * ledgers. Call AFTER the provider responds and cost is computed. Best-effort:
 * a failure here never fails the user's request (the turn already succeeded).
 */
export async function recordSpend(req: Request, amountUsd: number): Promise<void> {
  if (!(amountUsd > 0)) return;
  const ip = clientIp(req);
  // Always update the in-process ledger too, so the backstop's spend cap has a
  // running total to enforce against if Supabase drops out later in the day.
  memSpendRecord(ip, amountUsd);
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  try {
    const { error } = await supabase.rpc("spend_record", {
      p_ip: ip,
      p_amount: amountUsd,
    });
    if (error) console.error("[rate-limit] spend_record failed:", error.message);
  } catch (err) {
    console.error("[rate-limit] spend_record threw:", err);
  }
}
