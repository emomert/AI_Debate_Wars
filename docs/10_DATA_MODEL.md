# 10 — Data Model

> Updated 2026-06-11. Source of truth: `src/lib/debate/debateTypes.ts` (client
> types), `src/lib/supabase/matches.ts` + `src/lib/community/types.ts`, and the
> Supabase migrations in `supabase/migrations/` (persistence).

## State Strategy

- **Live match:** client-side (`ArenaContext` + sessionStorage). No server record exists while a match runs; server routes re-validate and bound the client-supplied session on every call.
- **Saved matches:** signed-in users explicitly save finished matches to Supabase (`matches` table, RLS-protected).
- **Share links:** stateless — the verdict payload is base64url-encoded in the URL.
- **Shared matches (community):** a sanitized snapshot copied into `shared_matches` at publish time; independent of the private `matches` row. See `docs/20_COMMUNITY.md`.

## Core Client Types (`debateTypes.ts`)

- `DebateConfig` — topic, mode, fighters, roundCount (3|5|7), tone per fighter (serious|aggressive|casual|custom), responseLength, pace (manual|auto), deepDebate, judge config, language.
- `DebateSession` — config + deterministic `turns[]` + `messages[]` + optional `verdict` + `costSummary` + status (`setup | running | judging | complete | stopped | error`).
- `DebateTurn` — round number/label, speaker, task, role, stance, modelId, status.
- `DebateMessage` — content, usage (`TokenUsage` incl. cached input), `CostBreakdown` (input/output/cachedSavings/search/total), latency, `Citation[]`, status.
- `DebateVerdict` — winner (`modelA | modelB | tie | not_applicable`), 0–100 scores, reasoning, strongest/weakest arguments per side, judge model, usage/cost.

## Supabase Tables

### `profiles`

One row per user (migration 0004): optional unique `username` (lowercase
handle) + preset emoji `avatar` — the public identity on community posts,
votes and comments. RLS: readable by everyone, writable only by the owner.
Auto-provisioned on first publish/comment; edited on `/profile`.

### `matches`

One row per saved match: `id, user_id, app_session_id, topic, mode, round_count, model_a, model_b, winner, total_cost, deep_debate, session (jsonb), created_at`.

- `session` stores the full `DebateSession` snapshot so the schema doesn't churn as types evolve; reopening rehydrates it into `ArenaContext`.
- Promoted columns power the history list and stats without parsing blobs; `computeStats(rows)` derives totals, win counts, top fighter, mode split, Deep Debate usage.
- RLS: a user reads/writes only their own rows; size caps mirror the server validators.
- `match_analytics` — one dimensions-only row per finished match (no topic/transcript/custom-tone text), written server-side at verdict time via the service-role key; deny-all RLS. Powers the owner-only `/admin` dashboard. See `docs/22_ANALYTICS.md`.

### `shared_matches`, `shared_match_votes`, `shared_match_comments`

The community layer (migration 0004, full detail in `docs/20_COMMUNITY.md`):

- `shared_matches` — slug id, owner, sharer options (`visibility`,
  `show_models`, `include_verdict`), promoted feed columns, a sanitized
  `snapshot (jsonb)` (`SharedSnapshot` — no costs/usage/model ids; masked
  fighters when hidden), and denormalized `vote_a/vote_b/vote_tie/vote_count/
  comment_count` counters maintained only by RPCs/triggers.
- `shared_match_votes` — one side-vote per `(post_id, user_id)`; written only
  through `cast_vote()`.
- `shared_match_comments` — flat comments (1–500 chars); inserted via
  `add_comment()`, deletable by author or post owner via RLS.

### Rate-limit / spend RPCs

`rl_hit` (fixed-window per-IP counters), `spend_allowed` and `spend_record` (global + per-IP daily USD ledger). See `docs/11_SECURITY_RATE_LIMITS.md`.

## Invariants

- Each message stores its own usage and cost.
- The verdict is separate from turn messages.
- Session status is explicit at every stage.
- The app remains fully functional with no database configured (matches just aren't saved; rate/spend limits fall back to an in-process per-instance backstop instead of failing fully open).
