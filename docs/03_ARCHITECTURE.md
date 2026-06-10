# 03 — Technical Architecture

> Updated 2026-06-10 to match the implemented system.

## Architecture Summary

Layered architecture:

1. UI Layer (React components, arcade design system)
2. Debate Orchestration Layer (deterministic, client-driven)
3. Prompt Construction Layer
4. Provider Abstraction Layer (OpenAI / DeepSeek / OpenRouter)
5. Cost Tracking Layer
6. API Routes (server-side provider calls, rate limiting, spend caps)
7. Optional persistence (Supabase: auth, match history, rate-limit/spend RPCs)

The key architectural rule:

> UI components never call a model provider directly, and the debate engine never knows which provider is in use.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS + Framer Motion
- Server-side provider calls in API routes (Vercel functions, `maxDuration` 60s)
- Client state (`ArenaContext` + sessionStorage) for the live match
- Supabase (optional) for auth, saved matches, rate limits, and spend ledger
- Brave Search behind a search-provider interface for Deep Debate

## Actual Folder Structure

```txt
/src
  app
    page.tsx                 # home
    setup/ debate/ result/   # match flow
    s/                       # public share page (stateless, ?d= payload)
    profile/ login/ auth/    # optional accounts
    about/ privacy/ terms/   # legal
    report/                  # living tech report (real prompts/pricing)
    api
      debate/turn/route.ts      # one AI turn
      debate/verdict/route.ts   # judge verdict
      topic/check/route.ts      # AI topic check/improve
      health/route.ts           # provider availability
      og/route.tsx              # OG share image (edge)
  components
    game/ setup/ debate/ result/ profile/ legal/
  lib
    debate/      # orchestrator, roundPlans, promptBuilder, debateTypes,
                 # validators, verdictParser, citations, topicCheck
    providers/   # types, openaiProvider, deepseekProvider, openRouterProvider,
                 # openaiCompatible (shared base), providerRegistry
    models/      # modelRegistry (catalog, cost tiers, ratings, capabilities)
    cost/        # pricing, calculateCost
    search/      # searchRegistry, braveSearch
    supabase/    # env, client, server, middleware, matches
    security/    # rateLimit (per-IP limits + spend caps via Supabase RPC)
    share/       # shareLink (base64url verdict payload)
    i18n/        # config, LocaleProvider, dictionaries/en + /tr
    audio/       # soundManager (synth SFX + generative music)
    state/       # ArenaContext
    api/ utils/
  styles
```

## Layer Responsibilities

### UI Layer

Renders setup, arena, result, share, and profile screens; triggers API calls; plays animation/sound. Must not know provider APIs, calculate pricing, build prompts, or decide round logic.

### Debate Orchestration Layer (`lib/debate/orchestrator.ts`)

- `createDebateSession(config)` builds the full deterministic turn list up front
- `getNextTurn(session)` returns the first pending turn — the app, not the model, decides who speaks
- `isDebateComplete` / `shouldGenerateJudge` gate completion and judging

There is no `/api/debate/start` route: the session is created client-side (it contains no secrets) and each turn is generated server-side. Validators on the server bound every field (`assertValidSession`, length caps) so a forged session cannot amplify costs unboundedly.

### Prompt Construction Layer (`lib/debate/promptBuilder.ts`)

Builds system + turn + judge prompts from topic, role, stance, tone (per fighter, incl. custom), round objective, previous messages, response length, language addendum (Turkish), and Deep Debate addenda. One-turn-only and anti-repetition instructions are always included. The `/report` page renders prompts from these same functions.

### Provider Abstraction Layer (`lib/providers/`)

- `Provider.generate(input)` — system/user prompt, temperature, max tokens, web-search flag, timeout, abort signal → content, usage, latency, finish reason, citations
- `openaiCompatible.ts` shares the OpenAI-wire-format implementation across providers
- `providerRegistry.ts`: lookup, `generateWithRetry` (exponential backoff on transient errors), `providerAvailability()`, `resolveAutoJudge(session)`

### Cost Tracking Layer (`lib/cost/`)

Pricing table with cached-input rates; `calculateCost` returns input/output/cached-savings/search/total in USD. UI only displays the results it is given.

### Security Layer (`lib/security/rateLimit.ts`)

`enforceLimits(req, kind)` runs before any paid work on turn/verdict/topic routes; `recordSpend` after. Backed by Supabase RPCs (`rl_hit`, `spend_allowed`, `spend_record`); fails open when Supabase is absent so local dev works without keys.

## State Strategy

- Live match: client state + sessionStorage (refresh-safe on the same device).
- Saved matches: explicit save to Supabase (`matches` table, RLS-protected) for signed-in users.
- Share links: stateless — the verdict payload travels in the URL.

## Error Handling

Normalized `AppErrorCode`s (`MISSING_API_KEY`, `PROVIDER_TIMEOUT`, `PROVIDER_ERROR`, `INVALID_MODEL`, `INVALID_SESSION`, `RATE_LIMITED`, `TOKEN_LIMIT_EXCEEDED`, …) with playful UI copy. Raw provider errors are never forwarded to the client.

## Architecture Invariants

- Providers can be swapped without changing UI.
- Debate flow is deterministic; no infinite loops are possible.
- Costs are calculated outside UI components.
- API keys exist server-side only.
- Rate-limit and spend-cap checks precede every paid provider call.
- The app degrades gracefully with no Supabase and with any subset of provider keys (`/api/health` drives the UI hints).
