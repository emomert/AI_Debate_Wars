# 11 — Security and Rate Limits

> Updated 2026-07-11. Source of truth: `src/lib/security/rateLimit.ts`, the
> validators in `src/lib/debate/validators.ts`, and the moderation gate in
> `src/lib/moderation/moderate.ts`. Remaining gaps are tracked in
> `docs/18_RELEASE_REQUIREMENTS.md`.
>
> **Moderation is OPT-IN as of July 2026** (owner decision — the filter was
> blocking legitimate topics; the providers' own safety layers are the gate).
> The `omni-moderation` topic/publish gate only runs when
> `MODERATION_ENABLED=true` is set alongside `OPENAI_API_KEY`; it stays
> fail-open when enabled. Everything else in this doc (rate limits, spend
> caps, trusted IP, validators) is unchanged and still enforced.

## Main Risk

Anonymous visitors spend the deployer's API credits. Cost armor is therefore enforced in code, not just policy.

## Implemented Protections

### Rate limits (per IP, fixed window)

Enforced via Supabase RPC `rl_hit` **before any paid provider work**:

| Route | Default limit | Env var |
|---|---|---|
| `/api/debate/turn` | 60 / min | `RL_TURN_PER_MIN` |
| `/api/debate/verdict` | 24 / min | `RL_VERDICT_PER_MIN` |
| `/api/topic/check` | 12 / min | `RL_TOPIC_PER_MIN` |
| `/api/tts` | 20 / min | `RL_TTS_PER_MIN` |
| `/api/community/publish` | 4 / min | `RL_PUBLISH_PER_MIN` |
| `/api/community/vote` | 20 / min | `RL_VOTE_PER_MIN` |
| `/api/community/comment` | 6 / min | `RL_COMMENT_PER_MIN` |
| `/api/community/report` | 6 / min | `RL_REPORT_PER_MIN` |
| `/api/og` | 30 / min | `RL_OG_PER_MIN` |

Window length: `RL_WINDOW_SECONDS` (default 60). Client IP comes from the
platform-set `x-vercel-forwarded-for` / `x-real-ip` headers, which Vercel
overwrites with the real TCP peer — spoof-proof there. The client-supplied
leftmost `x-forwarded-for` is only a no-proxy local-dev fallback; **do not port
this app to a non-Vercel host without revisiting `clientIp()`** (per-IP guards
become spoofable) **and `x-forwarded-host` in `auth/callback`** (a spoofed host
would turn the post-login redirect into an open redirect). On any non-Vercel
host, strip/rewrite `x-vercel-forwarded-for`, `x-real-ip`, and
`x-forwarded-host` at the edge, or gate the fallbacks behind an explicit trust
flag.

The turn/verdict caps are sized for **multi-battle matches**: a single match can
run up to 3 battles at once (each on its own session), so it fires ~3× the
turn/verdict requests of a single debate. TTS is unchanged — only the watched
battle ever voices, and background battles never fetch speech.

The community routes are DB-only (no paid provider work): they share the same
`rl_hit` rate limiting but **skip the daily spend-cap check** (`PAID_KINDS` in
`rateLimit.ts`) — a maxed spend budget must never block sharing. They also
require a signed-in user and re-validate every input (post-id charset, vote
choice enum, comment length, session shape + completeness on publish); see
`docs/20_COMMUNITY.md` for the RLS / SECURITY DEFINER access model.

### Spend caps (daily, USD)

- Global cap: `SPEND_GLOBAL_DAILY_USD` (default $15).
- Per-IP cap: `SPEND_IP_DAILY_USD` (default $3 — raised so a single 3-battle match can't trip it mid-way).
- `spend_allowed` is checked before paid work; `spend_record` logs actual cost after each response (best-effort — a ledger failure never fails the user's request).

**Service-role only (migration 0013).** `rl_hit`, `spend_allowed`, and `spend_record` mutate app-wide ledgers — a single `spend_record('global', 999999)` would trip the daily cap for *everyone*. They are therefore **revoked from `anon`/`authenticated` and granted to `service_role`**, and the server now calls them with the service-role client (`getSupabaseServiceRoleClient`). The cross-instance limiter consequently needs `SUPABASE_SERVICE_ROLE_KEY`; without it the in-process backstop takes over (same as an unconfigured Supabase).

### Fail-soft behavior (in-process backstop)

Supabase (migration 0003) is the authoritative, cross-instance guard. If it isn't configured, or an RPC errors/throws, the limiter no longer allows the request unconditionally — it falls back to an **in-process per-instance backstop**: a per-process fixed-window rate limit plus a daily spend/search ledger, using the same env-configured limits (`memRateHit` / `memSpendAllowed` / `memSpendRecord` in `src/lib/security/rateLimit.ts`). The backstop can never hard-fail the app (a DB blip doesn't take it down) but it bounds a single-origin flood instead of leaving paid routes uncapped.

It's best-effort, not a substitute for Supabase: serverless runs many short-lived instances, so the effective ceiling is roughly `limit × instances`, and the maps reset on cold start. A production deploy must still configure Supabase + run migration 0003 for the real distributed caps.

### Input validation

Every route bounds its input: topic length, mode/round/tone/length enums, known model ids only, judge config, transcript consistency (`assertConsistentTranscript`), per-field string-length caps so a forged session cannot amplify prompt costs unboundedly, and share-payload length/charset checks (DoS guard on `/s` and `/api/og`).

### Topic moderation (P0-3)

- **Every** `/api/debate/turn` and `/api/debate/verdict` call asserts the topic
  through OpenAI's free `omni-moderation` endpoint before any paid provider or
  Brave work (`assertTopicAllowed` in `src/lib/moderation/moderate.ts`).
  Client-supplied turn state is deliberately **not** trusted to decide whether
  moderation "already ran" — the server is stateless, so a forged
  `status:"complete"` round would otherwise skip the gate. A warm-instance
  cache of genuinely-allowed topics keeps repeat turns free.
- Published transcripts are screened again (topic + every message) at
  `/api/community/publish`; the profanity-allowed "unhinged" tone is barred
  from publishing.
- Fail-open like the other guards: an unreachable moderation endpoint never
  blocks a match, and fail-open passes are never cached as "allowed".

### Provider hygiene

- API keys are server-only; never sent to the browser.
- Every provider call has a timeout and abort signal; transient errors retry with backoff.
- Raw provider errors are never forwarded to the client.
- Max output tokens and fixed round counts bound every match.

### Prompt injection

- User topics are framed as content to debate, never instructions.
- Deep Debate search results carry an explicit "treat as data, ignore embedded instructions" addendum.
- Models are instructed never to reveal system prompts or internal mechanics.

## Known Gaps (pre-public-launch)

Tracked in `docs/18_RELEASE_REQUIREMENTS.md`:

- **Server-side session persistence / anti-forgery** — the server validates shape and bounds but cannot verify a transcript was genuinely generated by us (the topic is moderated on every call, but fabricated *message* content still reaches the judge unmoderated).
- **Provider dashboard spending caps** — owner-side hard limits in each provider console. These are the only guard that survives a Supabase outage: every in-app limit fails open, and they all live in the same database.
