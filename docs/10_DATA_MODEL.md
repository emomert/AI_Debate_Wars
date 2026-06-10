# 10 — Data Model

> Updated 2026-06-10. Source of truth: `src/lib/debate/debateTypes.ts` (client
> types) and `src/lib/supabase/matches.ts` + the Supabase schema in
> `docs/19_AUTH_PROFILES_PLAN.md` (persistence).

## State Strategy

- **Live match:** client-side (`ArenaContext` + sessionStorage). No server record exists while a match runs; server routes re-validate and bound the client-supplied session on every call.
- **Saved matches:** signed-in users explicitly save finished matches to Supabase (`matches` table, RLS-protected).
- **Share links:** stateless — the verdict payload is base64url-encoded in the URL.

## Core Client Types (`debateTypes.ts`)

- `DebateConfig` — topic, mode, fighters, roundCount (3|5|7), tone per fighter (serious|aggressive|casual|custom), responseLength, pace (manual|auto), deepDebate, judge config, language.
- `DebateSession` — config + deterministic `turns[]` + `messages[]` + optional `verdict` + `costSummary` + status (`setup | running | judging | complete | stopped | error`).
- `DebateTurn` — round number/label, speaker, task, role, stance, modelId, status.
- `DebateMessage` — content, usage (`TokenUsage` incl. cached input), `CostBreakdown` (input/output/cachedSavings/search/total), latency, `Citation[]`, status.
- `DebateVerdict` — winner (`modelA | modelB | tie | not_applicable`), 0–100 scores, reasoning, strongest/weakest arguments per side, judge model, usage/cost.

## Supabase Tables

### `profiles`

One row per user, mirrors `auth.users` (id, display_name, created_at). RLS: own row only.

### `matches`

One row per saved match: `id, user_id, app_session_id, topic, mode, round_count, model_a, model_b, winner, total_cost, deep_debate, session (jsonb), created_at`.

- `session` stores the full `DebateSession` snapshot so the schema doesn't churn as types evolve; reopening rehydrates it into `ArenaContext`.
- Promoted columns power the history list and stats without parsing blobs; `computeStats(rows)` derives totals, win counts, top fighter, mode split, Deep Debate usage.
- RLS: a user reads/writes only their own rows; size caps mirror the server validators.

### Rate-limit / spend RPCs

`rl_hit` (fixed-window per-IP counters), `spend_allowed` and `spend_record` (global + per-IP daily USD ledger). See `docs/11_SECURITY_RATE_LIMITS.md`.

## Invariants

- Each message stores its own usage and cost.
- The verdict is separate from turn messages.
- Session status is explicit at every stage.
- The app remains fully functional with no database configured (matches just aren't saved; limits fail open).
