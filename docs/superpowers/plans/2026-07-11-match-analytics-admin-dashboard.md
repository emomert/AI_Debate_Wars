# Match Analytics Cards + Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record a privacy-safe analytics "card" (no topic text, no transcript, no custom-tone wording) server-side at verdict time, and expose an owner-only admin dashboard that aggregates model picks, judge choices, match counts, and cost.

**Architecture:** A new `match_analytics` table stores one flat row per finished match — dimensions only, never content. The row is written **server-side from the verdict route** using the Supabase service-role key (RLS denies all anon/authenticated access to the table). The admin dashboard is a normal app page gated to an env allowlist of owner account IDs; it reads through a server route that uses the same service-role key to run aggregate queries. The user's own full-session history (`matches` table, client-saved, RLS-locked) is untouched — this is additive.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres + `@supabase/supabase-js`), vitest, Tailwind (arcade design system).

## Global Constraints

- **Never store debate content in `match_analytics`:** no `topic`, no message/transcript text, no `customTone`/`customToneA`/`customToneB` wording. Store the tone *preset name* only (`serious`/`aggressive`/`casual`/`custom`/`unhinged`). This is the entire point of the feature — a test enforces it (Task 3).
- **Service-role key is server-only:** `SUPABASE_SERVICE_ROLE_KEY` must never be imported into a client component or a `NEXT_PUBLIC_*` var. Every module that reads it starts with `import "server-only";`.
- **Everything fails soft:** analytics recording must never throw into the verdict route or fail a user's verdict. Admin/analytics being unconfigured (no service-role key) must degrade gracefully, never crash a page.
- **Follow existing DB patterns:** migrations are idempotent (`create table if not exists`, `create index if not exists`, guarded `do $$` blocks), RLS enabled with *no policies* = deny-all direct access (mirror `rate_limit_hits` in `supabase/migrations/0003_rate_limits.sql`). Apply via `node scripts/apply-migrations.mjs <file>`.
- **Run `npx tsc --noEmit` and `npx vitest run` before declaring any task done.** Commit after each task.
- **Model identifiers are stored as model IDs** (e.g. `anthropic/claude-sonnet-5`), not display names — IDs are stable analytics keys. The dashboard resolves IDs → display names at render via `getModelById` (`src/lib/models/modelRegistry.ts`).

---

## File Structure

**Created:**
- `supabase/migrations/0009_match_analytics.sql` — the analytics table (deny-all RLS) + index.
- `src/lib/supabase/admin.ts` — server-only service-role client factory.
- `src/lib/admin/access.ts` — `ADMIN_USER_IDS` allowlist parsing + `isAdminUserId`.
- `src/lib/admin/access.test.ts` — allowlist unit tests.
- `src/lib/analytics/matchCard.ts` — `MatchCard` type + `buildMatchCard(session, opts)` (pure).
- `src/lib/analytics/matchCard.test.ts` — card-builder unit tests (incl. the no-content privacy assertions).
- `src/lib/analytics/aggregate.ts` — pure aggregation functions over `StoredMatchCard[]` + `buildDashboard`.
- `src/lib/analytics/aggregate.test.ts` — aggregation unit tests.
- `src/lib/analytics/recordMatch.ts` — server-only `recordMatchAnalytics(session, opts)` (resolve user id + upsert via service-role).
- `src/lib/analytics/recordMatch.test.ts` — guard test (no service-role → no-op, never throws).
- `src/app/api/admin/analytics/route.ts` — owner-gated GET returning the dashboard payload.
- `src/app/api/admin/analytics/route.test.ts` — non-admin → 404 guard test.
- `src/app/admin/page.tsx` — server component, owner-gated (`notFound()` otherwise).
- `src/components/admin/AdminDashboard.tsx` — client dashboard (fetch + render).
- `docs/22_ANALYTICS.md` — how it works, privacy stance, env, admin access.

**Modified:**
- `src/app/api/debate/verdict/route.ts` — call `recordMatchAnalytics(...)` best-effort after `recordSpend`.
- `CLAUDE.md` — env vars (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USER_IDS`), repository-map + feature notes.
- `docs/10_DATA_MODEL.md` — note the analytics table (dimensions-only) alongside `matches`.

**Untouched (intentionally):** `src/components/result/MatchSaver.tsx`, `src/lib/supabase/matches.ts` — the user's own full-session history is a separate, privacy-scoped feature and stays as-is.

---

### Task 1: Analytics table migration

**Files:**
- Create: `supabase/migrations/0009_match_analytics.sql`

**Interfaces:**
- Produces: table `public.match_analytics` with columns (exact names, used by Tasks 3/5/6): `id uuid pk`, `app_session_id text unique`, `user_id uuid null`, `mode text`, `round_count int`, `battle_count int`, `deep_debate bool`, `tone text`, `response_length text`, `pace text`, `language text`, `model_a_id text`, `model_b_id text`, `judge_mode text`, `judge_model_id text`, `winner text null`, `score_a int null`, `score_b int null`, `match_cost numeric`, `verdict_cost numeric`, `created_at timestamptz`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0009_match_analytics.sql`:

```sql
-- Debator — privacy-safe match analytics "cards" (dimensions only).
--
-- ONE flat row per finished match, written SERVER-SIDE from the verdict route
-- (via the service-role key). Deliberately stores NO content: no topic text, no
-- transcript, no custom-tone wording — only the tone PRESET name. Powers the
-- owner-only admin dashboard.
--
-- RLS is ON with NO policies → anon/authenticated get zero direct access (same
-- lock as rate_limit_hits in 0003). Only the service-role key (server-only,
-- bypasses RLS) reads/writes it. Additive + idempotent → safe to re-run.

create table if not exists public.match_analytics (
  id               uuid primary key default gen_random_uuid(),
  -- one row per client session; a re-judge upserts the same row.
  app_session_id   text not null unique,
  -- nullable + set-null on delete: keep aggregate counts but drop the identity
  -- link when a user deletes their account (no orphaned PII).
  user_id          uuid references auth.users (id) on delete set null,
  mode             text not null,
  round_count      int  not null,
  battle_count     int  not null default 1,
  deep_debate      boolean not null default false,
  -- tone PRESET only (serious/aggressive/casual/custom/unhinged) — never the
  -- free-text custom wording.
  tone             text not null,
  response_length  text not null,
  pace             text not null,
  language         text not null default 'en',
  model_a_id       text not null,
  model_b_id       text not null,
  judge_mode       text not null,   -- auto | thirdModel | modelA | modelB
  judge_model_id   text not null,   -- the resolved model that actually judged
  winner           text,            -- modelA | modelB | tie | not_applicable | null
  score_a          int,
  score_b          int,
  match_cost       numeric(12, 6) not null default 0, -- accumulated turn+judge cost
  verdict_cost     numeric(12, 6) not null default 0, -- this verdict call's cost
  created_at       timestamptz not null default now()
);

create index if not exists match_analytics_created_idx
  on public.match_analytics (created_at desc);

alter table public.match_analytics enable row level security;
-- No policies on purpose → deny-all for anon/authenticated. Only the
-- service-role key (server analytics writer + admin route) may touch it.
```

- [ ] **Step 2: Apply the migration to the database**

Run: `node scripts/apply-migrations.mjs 0009_match_analytics.sql`
Expected output: `  ✓ 0009_match_analytics.sql` then `All migrations applied. ✅`

- [ ] **Step 3: Verify table + RLS state**

Run this one-off check (reuses the same `pg` connection as the apply script). Create a temp file `verify-0009.mjs` at repo root:

```js
import { readFileSync } from "node:fs";
let conn = process.env.SUPABASE_DB_URL;
if (!conn) { const m = readFileSync(".env.local","utf8").match(/^\s*SUPABASE_DB_URL\s*=\s*(.+)$/m); if (m) conn = m[1].trim().replace(/^["']|["']$/g,""); }
if (!/sslmode=/.test(conn)) conn += (conn.includes("?")?"&":"?")+"uselibpqcompat=true&sslmode=require";
const { Client } = await import("pg");
const c = new Client({ connectionString: conn }); await c.connect();
const t = await c.query(`select relrowsecurity from pg_class where relname='match_analytics'`);
const p = await c.query(`select count(*)::int n from pg_policies where tablename='match_analytics'`);
console.log("rls_enabled:", t.rows[0]?.relrowsecurity, "policies:", p.rows[0].n);
await c.end();
```

Run: `node verify-0009.mjs` — Expected: `rls_enabled: true policies: 0`
Then delete it: `rm verify-0009.mjs`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0009_match_analytics.sql
git commit -m "feat(analytics): match_analytics table (dimensions-only, deny-all RLS)"
```

---

### Task 2: Service-role client + admin allowlist

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/admin/access.ts`
- Test: `src/lib/admin/access.test.ts`

**Interfaces:**
- Produces: `getSupabaseServiceRoleClient(): SupabaseClient | null` (server-only).
- Produces: `isAdminUserId(id: string | null | undefined): boolean`.

- [ ] **Step 1: Write the failing allowlist test**

Create `src/lib/admin/access.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { isAdminUserId } from "./access";

afterEach(() => vi.unstubAllEnvs());

describe("isAdminUserId", () => {
  it("matches an id in the comma-separated allowlist (trimmed)", () => {
    vi.stubEnv("ADMIN_USER_IDS", "aaa-111, bbb-222 ,ccc-333");
    expect(isAdminUserId("bbb-222")).toBe(true);
    expect(isAdminUserId("ccc-333")).toBe(true);
  });

  it("rejects ids not in the list, and null/empty/undefined", () => {
    vi.stubEnv("ADMIN_USER_IDS", "aaa-111");
    expect(isAdminUserId("zzz-999")).toBe(false);
    expect(isAdminUserId(null)).toBe(false);
    expect(isAdminUserId(undefined)).toBe(false);
    expect(isAdminUserId("")).toBe(false);
  });

  it("treats an unset/empty allowlist as no admins", () => {
    vi.stubEnv("ADMIN_USER_IDS", "");
    expect(isAdminUserId("aaa-111")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/admin/access.test.ts`
Expected: FAIL (`Cannot find module './access'`).

- [ ] **Step 3: Implement the allowlist**

Create `src/lib/admin/access.ts`:

```ts
/**
 * Admin gating. There is no admin role in the DB — the owner is identified by an
 * env allowlist of Supabase user ids (ADMIN_USER_IDS, comma-separated). Simple,
 * leak-proof (no shared password), and there's an audit trail (each admin action
 * is tied to a real signed-in account). Read fresh each call so changing the env
 * needs no rebuild of module state.
 */
export function adminUserIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isAdminUserId(id: string | null | undefined): boolean {
  return Boolean(id) && adminUserIds().has(id as string);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/admin/access.test.ts` — Expected: PASS (3 tests).

- [ ] **Step 5: Implement the service-role client**

Create `src/lib/supabase/admin.ts`:

```ts
import "server-only";

/**
 * Service-role Supabase client — SERVER-ONLY, bypasses RLS. Used by exactly two
 * places: the analytics writer (server-side match-card upsert) and the owner
 * admin route (cross-user aggregate reads). The key must NEVER reach the client;
 * it is read from SUPABASE_SERVICE_ROLE_KEY (not a NEXT_PUBLIC_* var). Returns
 * null when unconfigured so analytics/admin degrade gracefully instead of
 * crashing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/supabase/env";

export function getSupabaseServiceRoleClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` — Expected: no output.

```bash
git add src/lib/supabase/admin.ts src/lib/admin/access.ts src/lib/admin/access.test.ts
git commit -m "feat(analytics): service-role client + admin allowlist gate"
```

---

### Task 3: Match-card builder (the privacy boundary)

**Files:**
- Create: `src/lib/analytics/matchCard.ts`
- Test: `src/lib/analytics/matchCard.test.ts`

**Interfaces:**
- Consumes: `DebateSession` (`@/lib/debate/debateTypes`).
- Produces: `interface MatchCard` (matches Task 1 columns, minus `id`/`created_at`).
- Produces: `buildMatchCard(session: DebateSession, opts: { judgeModelId: string; verdictCost: number; userId: string | null }): MatchCard`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/analytics/matchCard.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildMatchCard } from "./matchCard";
import type { DebateSession } from "@/lib/debate/debateTypes";

function baseSession(over: Partial<DebateSession> = {}): DebateSession {
  return {
    id: "sess-1",
    topic: "SECRET TOPIC TEXT that must never be stored",
    mode: "debate",
    tone: "custom",
    customTone: "SECRET custom tone wording",
    deepDebate: true,
    responseLength: "short",
    roundCount: 3,
    pace: "auto",
    language: "en",
    battleCount: 2,
    judge: { enabled: true, mode: "thirdModel", model: { providerId: "openai", modelId: "gpt-4.1-mini" } },
    modelA: { providerId: "openrouter", modelId: "anthropic/claude-sonnet-5", displayName: "Sonnet 5", color: "blue" },
    modelB: { providerId: "openrouter", modelId: "x-ai/grok-4.5", displayName: "Grok 4.5", color: "red" },
    turns: [],
    messages: [{ content: "SECRET transcript text" }],
    verdict: { winner: "modelA", scoreModelA: 60, scoreModelB: 40 },
    costSummary: { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, totalCost: 0.0123, currency: "USD" },
    status: "complete",
    createdAt: "2026-07-11T00:00:00Z",
    updatedAt: "2026-07-11T00:00:00Z",
    ...over,
  } as unknown as DebateSession;
}

describe("buildMatchCard", () => {
  it("captures the dimensions from the session", () => {
    const card = buildMatchCard(baseSession(), {
      judgeModelId: "gpt-4.1-mini",
      verdictCost: 0.002,
      userId: "user-9",
    });
    expect(card).toMatchObject({
      app_session_id: "sess-1",
      user_id: "user-9",
      mode: "debate",
      round_count: 3,
      battle_count: 2,
      deep_debate: true,
      tone: "custom",
      response_length: "short",
      pace: "auto",
      language: "en",
      model_a_id: "anthropic/claude-sonnet-5",
      model_b_id: "x-ai/grok-4.5",
      judge_mode: "thirdModel",
      judge_model_id: "gpt-4.1-mini",
      winner: "modelA",
      score_a: 60,
      score_b: 40,
      match_cost: 0.0123,
      verdict_cost: 0.002,
    });
  });

  it("NEVER includes debate content (topic / transcript / custom-tone wording)", () => {
    const card = buildMatchCard(baseSession(), {
      judgeModelId: "gpt-4.1-mini",
      verdictCost: 0.002,
      userId: null,
    });
    const serialized = JSON.stringify(card);
    expect(serialized).not.toContain("SECRET TOPIC TEXT");
    expect(serialized).not.toContain("SECRET custom tone wording");
    expect(serialized).not.toContain("SECRET transcript text");
    // The card stores only the tone PRESET name, never the wording.
    expect(card.tone).toBe("custom");
    expect(Object.keys(card)).not.toContain("topic");
    expect(Object.keys(card)).not.toContain("customTone");
  });

  it("defaults battle_count/language and tolerates a missing verdict", () => {
    const card = buildMatchCard(
      baseSession({ battleCount: undefined, language: undefined, verdict: undefined }),
      { judgeModelId: "gpt-4o-mini", verdictCost: 0, userId: null },
    );
    expect(card.battle_count).toBe(1);
    expect(card.language).toBe("en");
    expect(card.winner).toBeNull();
    expect(card.score_a).toBeNull();
    expect(card.score_b).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/analytics/matchCard.test.ts`
Expected: FAIL (`Cannot find module './matchCard'`).

- [ ] **Step 3: Implement the card builder**

Create `src/lib/analytics/matchCard.ts`:

```ts
/**
 * The analytics "card": the dimensions-only projection of a finished match. This
 * is the privacy boundary — it MUST NOT carry any debate content (topic text,
 * transcript, or custom-tone wording); only the tone preset name is kept. A test
 * (matchCard.test.ts) enforces that content never leaks in.
 */
import type { DebateSession } from "@/lib/debate/debateTypes";

export interface MatchCard {
  app_session_id: string;
  user_id: string | null;
  mode: string;
  round_count: number;
  battle_count: number;
  deep_debate: boolean;
  tone: string;
  response_length: string;
  pace: string;
  language: string;
  model_a_id: string;
  model_b_id: string;
  judge_mode: string;
  judge_model_id: string;
  winner: string | null;
  score_a: number | null;
  score_b: number | null;
  match_cost: number;
  verdict_cost: number;
}

export function buildMatchCard(
  session: DebateSession,
  opts: { judgeModelId: string; verdictCost: number; userId: string | null },
): MatchCard {
  const v = session.verdict;
  return {
    app_session_id: session.id,
    user_id: opts.userId,
    mode: session.mode,
    round_count: session.roundCount,
    battle_count: session.battleCount ?? 1,
    deep_debate: session.deepDebate,
    tone: session.tone, // preset name only — never customTone wording
    response_length: session.responseLength,
    pace: session.pace,
    language: session.language ?? "en",
    model_a_id: session.modelA.modelId,
    model_b_id: session.modelB.modelId,
    judge_mode: session.judge.mode,
    judge_model_id: opts.judgeModelId,
    winner: v?.winner ?? null,
    score_a: typeof v?.scoreModelA === "number" ? v.scoreModelA : null,
    score_b: typeof v?.scoreModelB === "number" ? v.scoreModelB : null,
    match_cost: session.costSummary.totalCost,
    verdict_cost: opts.verdictCost,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/analytics/matchCard.test.ts` — Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` — Expected: no output.

```bash
git add src/lib/analytics/matchCard.ts src/lib/analytics/matchCard.test.ts
git commit -m "feat(analytics): dimensions-only match-card builder (no content stored)"
```

---

### Task 4: Aggregation functions + dashboard payload

**Files:**
- Create: `src/lib/analytics/aggregate.ts`
- Test: `src/lib/analytics/aggregate.test.ts`

**Interfaces:**
- Consumes: `MatchCard` (`@/lib/analytics/matchCard`).
- Produces: `type StoredMatchCard = MatchCard & { created_at: string }`.
- Produces: `buildDashboard(cards: StoredMatchCard[]): DashboardData` where `DashboardData` has fields: `overview`, `perDay`, `topFighters`, `topJudges`, `judgeModes`, `winners`, `modes`, `tones`, `lengths`, `deepShare`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/analytics/aggregate.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildDashboard, type StoredMatchCard } from "./aggregate";

function card(over: Partial<StoredMatchCard> = {}): StoredMatchCard {
  return {
    app_session_id: Math.random().toString(36).slice(2),
    user_id: "u1",
    mode: "debate",
    round_count: 3,
    battle_count: 1,
    deep_debate: false,
    tone: "serious",
    response_length: "short",
    pace: "auto",
    language: "en",
    model_a_id: "anthropic/claude-sonnet-5",
    model_b_id: "x-ai/grok-4.5",
    judge_mode: "auto",
    judge_model_id: "gpt-4.1-mini",
    winner: "modelA",
    score_a: 60,
    score_b: 40,
    match_cost: 0.01,
    verdict_cost: 0.002,
    created_at: "2026-07-10T12:00:00Z",
    ...over,
  };
}

describe("buildDashboard", () => {
  it("computes overview totals and unique users", () => {
    const d = buildDashboard([
      card({ user_id: "u1", match_cost: 0.01, verdict_cost: 0.002 }),
      card({ user_id: "u1", match_cost: 0.02, verdict_cost: 0.003 }),
      card({ user_id: "u2", match_cost: 0.03, verdict_cost: 0.004 }),
    ]);
    expect(d.overview.matches).toBe(3);
    expect(d.overview.uniqueUsers).toBe(2);
    expect(d.overview.totalMatchCost).toBeCloseTo(0.06, 6);
    expect(d.overview.totalVerdictCost).toBeCloseTo(0.009, 6);
  });

  it("counts fighter appearances across both slots", () => {
    const d = buildDashboard([
      card({ model_a_id: "A", model_b_id: "B" }),
      card({ model_a_id: "A", model_b_id: "C" }),
      card({ model_a_id: "C", model_b_id: "B" }),
    ]);
    const map = Object.fromEntries(d.topFighters.map((f) => [f.key, f.count]));
    expect(map.A).toBe(2);
    expect(map.B).toBe(2);
    expect(map.C).toBe(2);
  });

  it("breaks down judge mode (answers 'do users change the judge?')", () => {
    const d = buildDashboard([
      card({ judge_mode: "auto" }),
      card({ judge_mode: "auto" }),
      card({ judge_mode: "thirdModel" }),
    ]);
    const map = Object.fromEntries(d.judgeModes.map((j) => [j.key, j.count]));
    expect(map.auto).toBe(2);
    expect(map.thirdModel).toBe(1);
  });

  it("counts judge models actually used", () => {
    const d = buildDashboard([
      card({ judge_model_id: "gpt-4.1-mini" }),
      card({ judge_model_id: "gpt-4.1-mini" }),
      card({ judge_model_id: "google/gemini-3.1-flash-lite" }),
    ]);
    expect(d.topJudges[0]).toEqual({ key: "gpt-4.1-mini", count: 2 });
  });

  it("buckets matches by UTC day, oldest first", () => {
    const d = buildDashboard([
      card({ created_at: "2026-07-10T23:00:00Z", match_cost: 0.01 }),
      card({ created_at: "2026-07-11T01:00:00Z", match_cost: 0.02 }),
      card({ created_at: "2026-07-11T05:00:00Z", match_cost: 0.03 }),
    ]);
    expect(d.perDay).toEqual([
      { day: "2026-07-10", count: 1, cost: 0.01 },
      { day: "2026-07-11", count: 2, cost: 0.05 },
    ]);
  });

  it("reports deep-debate share", () => {
    const d = buildDashboard([card({ deep_debate: true }), card({ deep_debate: false })]);
    expect(d.deepShare).toBeCloseTo(0.5, 6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/analytics/aggregate.test.ts`
Expected: FAIL (`Cannot find module './aggregate'`).

- [ ] **Step 3: Implement the aggregation**

Create `src/lib/analytics/aggregate.ts`:

```ts
/**
 * Pure aggregation over analytics cards → the admin dashboard payload. Kept pure
 * (no DB, no env) so it's fully unit-tested; the admin route fetches the rows and
 * calls buildDashboard on them. At launch volume, aggregating in JS over the
 * flat (blob-free) rows is cheap; move hot aggregates to SQL if volume demands.
 */
import type { MatchCard } from "@/lib/analytics/matchCard";

export type StoredMatchCard = MatchCard & { created_at: string };

export interface Tally {
  key: string;
  count: number;
}

export interface DayPoint {
  day: string;
  count: number;
  cost: number;
}

export interface DashboardData {
  overview: {
    matches: number;
    uniqueUsers: number;
    totalMatchCost: number;
    totalVerdictCost: number;
    avgRounds: number;
  };
  perDay: DayPoint[];
  topFighters: Tally[];
  topJudges: Tally[];
  judgeModes: Tally[];
  winners: Tally[];
  modes: Tally[];
  tones: Tally[];
  lengths: Tally[];
  deepShare: number;
}

/** Count occurrences of a derived key, returned as a count-desc Tally[]. */
function tally(cards: StoredMatchCard[], keyOf: (c: StoredMatchCard) => string): Tally[] {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const k = keyOf(c);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildDashboard(cards: StoredMatchCard[]): DashboardData {
  const matches = cards.length;
  const users = new Set<string>();
  let totalMatchCost = 0;
  let totalVerdictCost = 0;
  let totalRounds = 0;
  let deep = 0;
  const byDay = new Map<string, { count: number; cost: number }>();

  for (const c of cards) {
    if (c.user_id) users.add(c.user_id);
    totalMatchCost += Number(c.match_cost) || 0;
    totalVerdictCost += Number(c.verdict_cost) || 0;
    totalRounds += Number(c.round_count) || 0;
    if (c.deep_debate) deep += 1;
    const day = c.created_at.slice(0, 10); // UTC ISO date
    const d = byDay.get(day) ?? { count: 0, cost: 0 };
    d.count += 1;
    d.cost += Number(c.match_cost) || 0;
    byDay.set(day, d);
  }

  const perDay: DayPoint[] = [...byDay.entries()]
    .map(([day, v]) => ({ day, count: v.count, cost: v.cost }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Fighters appear in either slot — count both.
  const fighters = tally(
    cards.flatMap((c) => [
      { ...c, __k: c.model_a_id },
      { ...c, __k: c.model_b_id },
    ]) as unknown as StoredMatchCard[],
    (c) => (c as unknown as { __k: string }).__k,
  );

  return {
    overview: {
      matches,
      uniqueUsers: users.size,
      totalMatchCost,
      totalVerdictCost,
      avgRounds: matches ? totalRounds / matches : 0,
    },
    perDay,
    topFighters: fighters,
    topJudges: tally(cards, (c) => c.judge_model_id),
    judgeModes: tally(cards, (c) => c.judge_mode),
    winners: tally(cards, (c) => c.winner ?? "none"),
    modes: tally(cards, (c) => c.mode),
    tones: tally(cards, (c) => c.tone),
    lengths: tally(cards, (c) => c.response_length),
    deepShare: matches ? deep / matches : 0,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/analytics/aggregate.test.ts` — Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` — Expected: no output.

```bash
git add src/lib/analytics/aggregate.ts src/lib/analytics/aggregate.test.ts
git commit -m "feat(analytics): pure dashboard aggregation over match cards"
```

---

### Task 5: Server-side analytics writer + wire into verdict route

**Files:**
- Create: `src/lib/analytics/recordMatch.ts`
- Test: `src/lib/analytics/recordMatch.test.ts`
- Modify: `src/app/api/debate/verdict/route.ts`

**Interfaces:**
- Consumes: `buildMatchCard` (Task 3), `getSupabaseServiceRoleClient` (Task 2), `getSupabaseServerClient` (`@/lib/supabase/server`).
- Produces: `recordMatchAnalytics(session: DebateSession, opts: { judgeModelId: string; verdictCost: number }): Promise<void>` — resolves the caller's user id (best-effort) and upserts the card. Never throws.

- [ ] **Step 1: Write the failing guard test**

Create `src/lib/analytics/recordMatch.test.ts`:

```ts
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
      recordMatchAnalytics(session, { judgeModelId: "j", verdictCost: 0.002 }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/analytics/recordMatch.test.ts`
Expected: FAIL (`Cannot find module './recordMatch'`).

- [ ] **Step 3: Implement the writer**

Create `src/lib/analytics/recordMatch.ts`:

```ts
import "server-only";

/**
 * Server-side analytics writer. Called best-effort from the verdict route (the
 * match-finalize point — the judge is mandatory, so every match ends here).
 * Resolves the caller's user id from the cookie session, builds the dimensions-
 * only card, and upserts it via the service-role key. Analytics is OFF unless
 * SUPABASE_SERVICE_ROLE_KEY is set; this never throws into the caller.
 */
import type { DebateSession } from "@/lib/debate/debateTypes";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { buildMatchCard } from "@/lib/analytics/matchCard";

export async function recordMatchAnalytics(
  session: DebateSession,
  opts: { judgeModelId: string; verdictCost: number },
): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return; // analytics disabled unless service-role configured

  try {
    // Best-effort user id (null for anonymous / pre-paywall play). Uses the
    // cookie-scoped client purely to read auth.uid(); the WRITE is service-role.
    let userId: string | null = null;
    const cookieClient = await getSupabaseServerClient();
    if (cookieClient) {
      const { data } = await cookieClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const card = buildMatchCard(session, { ...opts, userId });
    const { error } = await admin
      .from("match_analytics")
      .upsert(card, { onConflict: "app_session_id" });
    if (error) console.error("[analytics] upsert failed:", error.message);
  } catch (err) {
    console.error("[analytics] recordMatchAnalytics threw:", err);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/analytics/recordMatch.test.ts` — Expected: PASS (1 test).

- [ ] **Step 5: Wire it into the verdict route**

In `src/app/api/debate/verdict/route.ts`, add the import near the other `@/lib` imports (after the `rateLimit` import on line 38):

```ts
import { recordMatchAnalytics } from "@/lib/analytics/recordMatch";
```

Then, immediately AFTER the existing `await recordSpend(req, cost.totalCost);` line (currently line 170), add:

```ts
    // Record the dimensions-only analytics card (no content) — best-effort, at
    // the match-finalize point. Never fails the verdict.
    await recordMatchAnalytics(session, {
      judgeModelId,
      verdictCost: cost.totalCost,
    });
```

- [ ] **Step 6: Typecheck + full suite + commit**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npx vitest run` — Expected: all pass.

```bash
git add src/lib/analytics/recordMatch.ts src/lib/analytics/recordMatch.test.ts src/app/api/debate/verdict/route.ts
git commit -m "feat(analytics): record match card server-side at verdict time"
```

---

### Task 6: Owner-gated admin analytics API route

**Files:**
- Create: `src/app/api/admin/analytics/route.ts`
- Test: `src/app/api/admin/analytics/route.test.ts`

**Interfaces:**
- Consumes: `isAdminUserId` (Task 2), `getSupabaseServiceRoleClient` (Task 2), `buildDashboard`/`StoredMatchCard` (Task 4), `getSupabaseServerClient`.
- Produces: `GET` returning `DashboardData` JSON for admins; `404` for everyone else; `503` when analytics is unconfigured.

- [ ] **Step 1: Write the failing guard test**

Create `src/app/api/admin/analytics/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/admin/analytics/route.test.ts`
Expected: FAIL (`Cannot find module './route'`).

- [ ] **Step 3: Implement the route**

Create `src/app/api/admin/analytics/route.ts`:

```ts
/**
 * GET /api/admin/analytics — owner-only. Authenticates via the cookie session,
 * checks the ADMIN_USER_IDS allowlist, and (for admins) reads the flat analytics
 * cards with the service-role key to bypass RLS, then returns the aggregated
 * dashboard. Non-admins get a 404 so the route's existence isn't revealed.
 */
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isAdminUserId } from "@/lib/admin/access";
import { buildDashboard, type StoredMatchCard } from "@/lib/analytics/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS =
  "app_session_id,user_id,mode,round_count,battle_count,deep_debate,tone,response_length,pace,language,model_a_id,model_b_id,judge_mode,judge_model_id,winner,score_a,score_b,match_cost,verdict_cost,created_at";

export async function GET(_req: Request): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  if (!isAdminUserId(data.user?.id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "analytics-unconfigured" }, { status: 503 });
  }

  const { data: rows, error } = await admin
    .from("match_analytics")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50_000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(buildDashboard((rows ?? []) as StoredMatchCard[]));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/api/admin/analytics/route.test.ts` — Expected: PASS (1 test).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` — Expected: no output.

```bash
git add src/app/api/admin/analytics/route.ts src/app/api/admin/analytics/route.test.ts
git commit -m "feat(analytics): owner-gated admin analytics API route"
```

---

### Task 7: Admin dashboard page + UI

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: `isAdminUserId`, `getSupabaseServerClient`, the `/api/admin/analytics` payload (`DashboardData`), `getModelById` (`@/lib/models/modelRegistry`) for id→name.

- [ ] **Step 1: Implement the server-gated page**

Create `src/app/admin/page.tsx`:

```tsx
/**
 * /admin — owner-only analytics dashboard. Server-gated: a non-admin (or signed-
 * out) visitor gets a 404 via notFound(), so the page's existence isn't leaked.
 * The client component fetches /api/admin/analytics (gated identically).
 */
import { notFound } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUserId } from "@/lib/admin/access";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!isAdminUserId(data.user?.id)) notFound();
  return <AdminDashboard />;
}
```

- [ ] **Step 2: Implement the dashboard UI**

Create `src/components/admin/AdminDashboard.tsx`. Requirements (arcade design system — thick `border-3 border-ink`, `rounded-card`, `shadow-hard-sm`, `bg-surface`; no new dependencies; resolve model ids to names with `getModelById`):

```tsx
"use client";

import { useEffect, useState } from "react";

import { getModelById } from "@/lib/models/modelRegistry";
import { formatCost } from "@/lib/utils/format";
import type { DashboardData, Tally } from "@/lib/analytics/aggregate";

const modelName = (id: string) => getModelById(id)?.displayName ?? id;

const JUDGE_MODE_LABEL: Record<string, string> = {
  auto: "Auto judge",
  thirdModel: "Picked a judge",
  modelA: "Fighter A judged",
  modelB: "Fighter B judged",
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border-3 border-ink bg-surface p-4 shadow-hard-sm">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink/55">{label}</div>
      <div className="mt-1 font-heading text-2xl font-extrabold">{value}</div>
    </div>
  );
}

/** A horizontal bar list — the max-count row fills the track; the rest scale to it. */
function BarList({
  title,
  rows,
  labelOf = (k) => k,
}: {
  title: string;
  rows: Tally[];
  labelOf?: (key: string) => string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <section className="rounded-card border-3 border-ink bg-surface p-4 shadow-hard-sm">
      <h2 className="mb-3 font-heading text-sm font-extrabold uppercase tracking-wide">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-ink/55">No data yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 12).map((r) => (
            <li key={r.key} className="text-xs">
              <div className="mb-0.5 flex justify-between gap-2">
                <span className="truncate font-semibold">{labelOf(r.key)}</span>
                <span className="shrink-0 font-mono text-ink/60">{r.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border-2 border-ink bg-paper">
                <div
                  className="h-full bg-arcade-blue"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 503 ? "Analytics isn't configured yet." : `Error ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="p-6 text-sm font-semibold text-arcade-red">{error}</p>;
  if (!data) return <p className="p-6 text-sm text-ink/60">Loading analytics…</p>;

  const o = data.overview;
  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="mb-4 font-heading text-2xl font-extrabold uppercase">Match Analytics</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Matches" value={o.matches.toLocaleString()} />
        <StatTile label="Unique players" value={o.uniqueUsers.toLocaleString()} />
        <StatTile label="Total cost" value={formatCost(o.totalMatchCost)} />
        <StatTile label="Judge cost" value={formatCost(o.totalVerdictCost)} />
        <StatTile label="Avg rounds" value={o.avgRounds.toFixed(1)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Most-used fighters" rows={data.topFighters} labelOf={modelName} />
        <BarList title="Judge models used" rows={data.topJudges} labelOf={modelName} />
        <BarList title="Judge selection" rows={data.judgeModes} labelOf={(k) => JUDGE_MODE_LABEL[k] ?? k} />
        <BarList title="Winners" rows={data.winners} />
        <BarList title="Tone" rows={data.tones} />
        <BarList title="Response length" rows={data.lengths} />
      </div>

      <section className="mt-4 rounded-card border-3 border-ink bg-surface p-4 shadow-hard-sm">
        <h2 className="mb-3 font-heading text-sm font-extrabold uppercase tracking-wide">
          Matches per day
        </h2>
        {data.perDay.length === 0 ? (
          <p className="text-xs text-ink/55">No data yet.</p>
        ) : (
          <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 120 }}>
            {data.perDay.map((p) => {
              const max = data.perDay.reduce((m, x) => Math.max(m, x.count), 0) || 1;
              return (
                <div
                  key={p.day}
                  title={`${p.day}: ${p.count} matches · ${formatCost(p.cost)}`}
                  className="w-3 shrink-0 rounded-t border-2 border-ink bg-arcade-purple"
                  style={{ height: `${Math.max(4, Math.round((p.count / max) * 110))}px` }}
                />
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[10px] text-ink/45">Deep Debate share: {(data.deepShare * 100).toFixed(0)}%</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit` — Expected: no output.
Run: `npm run build` — Expected: compiles; `/admin` and `/api/admin/analytics` appear in the route list.

- [ ] **Step 4: Browser verification (manual)**

Set `ADMIN_USER_IDS` to your own Supabase user id and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, run `npm run dev`, sign in as yourself, and open `/admin`. Confirm: stat tiles + bar lists render; a signed-out or non-admin visit to `/admin` shows the 404 page. (Empty state is expected until matches with analytics exist.)

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/AdminDashboard.tsx
git commit -m "feat(analytics): owner-only admin dashboard page + UI"
```

---

### Task 8: Docs + env + config notes

**Files:**
- Create: `docs/22_ANALYTICS.md`
- Modify: `CLAUDE.md`, `docs/10_DATA_MODEL.md`

- [ ] **Step 1: Write the analytics doc**

Create `docs/22_ANALYTICS.md`:

```markdown
# Analytics & Admin Dashboard

## What's recorded (and what isn't)

At verdict time (the match-finalize point — the judge is mandatory), the server
writes ONE flat "card" per match to `public.match_analytics`. It stores
**dimensions only** — never content:

- **Stored:** mode, round count, battle count, deep-debate flag, tone *preset*
  name, response length, pace, language, both fighter model **ids**, judge mode,
  resolved judge model id, winner, scores, match cost, verdict cost, an optional
  `user_id` (set-null on account deletion), and the timestamp.
- **Never stored:** the topic text, any message/transcript text, or the custom-
  tone wording. This is enforced by `matchCard.test.ts`.

The user's own full-session history (`matches`, client-saved, RLS-locked to the
owner) is a separate feature and is unchanged.

## How it's protected

`match_analytics` has RLS on with **no policies** → anon/authenticated get zero
direct access. Only the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`,
server-only) reads/writes it — used by the server writer (`recordMatchAnalytics`)
and the admin route. The writer is best-effort and never fails a verdict;
analytics is simply OFF if the service-role key isn't set.

## Admin access

The dashboard lives at `/admin`. There is no password and no admin role in the
DB — access is granted to the Supabase user ids listed in `ADMIN_USER_IDS`
(comma-separated). Sign in as that account; everyone else gets a 404 on both
`/admin` and `/api/admin/analytics`. Find your user id in the Supabase dashboard
(Authentication → Users) or from `auth.getUser()` while signed in.

## Known limitation

Because the debate engine is stateless, the card is built from the client-
submitted session, so a fabricated match could produce a fabricated card
(bounded by the rate/spend caps). Costs are server-computed per turn so cost
figures are accurate; categorical dimensions reflect what the client claimed.
```

- [ ] **Step 2: Update CLAUDE.md env section**

In `CLAUDE.md`, under "Environment Variables", after the Supabase line that mentions `SUPABASE_DB_URL`, add:

```markdown
Analytics/admin (server-only): `SUPABASE_SERVICE_ROLE_KEY` (enables the dimensions-only match-analytics writer + admin dashboard; never expose to the client), `ADMIN_USER_IDS` (comma-separated Supabase user ids allowed to view `/admin`).
```

Also add to the Repository Map, under the `src/lib/` entries:

```markdown
- `src/lib/analytics/` — dimensions-only match "cards" (no content): builder, pure aggregation, server writer (service-role)
- `src/lib/admin/access.ts` — `ADMIN_USER_IDS` allowlist gate for `/admin`
```

- [ ] **Step 3: Update the data-model doc**

In `docs/10_DATA_MODEL.md`, add a bullet near the `matches` description:

```markdown
- `match_analytics` — one dimensions-only row per finished match (no topic/transcript/custom-tone text), written server-side at verdict time via the service-role key; deny-all RLS. Powers the owner-only `/admin` dashboard. See `docs/22_ANALYTICS.md`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/22_ANALYTICS.md CLAUDE.md docs/10_DATA_MODEL.md
git commit -m "docs(analytics): document match cards, privacy stance, and admin access"
```

---

## Self-Review Notes

- **Privacy (the whole point):** enforced structurally (card builder omits content) and by test (`matchCard.test.ts` asserts topic/transcript/custom-tone strings never serialize into the card). ✓
- **Cross-user reads:** solved via service-role in one gated route, RLS left strict everywhere else. ✓
- **Admin gate:** env allowlist, 404 (not 403) so the route isn't discoverable; both page and API check identically. ✓
- **Reliability:** write is server-side at the mandatory verdict step, upsert-idempotent on `app_session_id` (a re-judge updates, not duplicates). ✓
- **Fails soft:** no service-role key → writer no-ops, admin route 503s, pages don't crash. ✓
- **Additive:** `MatchSaver` / `matches` untouched; no change to any user-facing flow. ✓
- **Scope discipline:** JS aggregation over blob-free rows (no chart lib, no warehouse); note left to move hot aggregates to SQL if volume grows. ✓
- **Blitz:** when `BLITZ_ENABLED` is flipped on, its verdict path needs the same `recordMatchAnalytics` call — noted here, out of scope now.
- **Type consistency:** `MatchCard` (Task 3) ⊂ `StoredMatchCard` (Task 4); column names match the migration (Task 1) and the route's `COLUMNS` select (Task 6). ✓
```
