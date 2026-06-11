# CLAUDE.md

## Project Name

Debator (AI Debate Arena)

## Product Summary

Debator is a gamified web application where users make two AI models debate a topic in a structured, finite match. Users pick a topic, choose two fighters from a large model catalog, set the round count, tone, response length, and pace, optionally enable Deep Debate (web-search-grounded turns with citations) and a neutral AI judge, then watch the match unfold in an arcade-style interface with live per-turn cost tracking.

The desired product feeling is:

> Arcade interface, serious intelligence.

## Current Status

The product is feature-complete and polished, in pre-public-launch state.

- **Debate Mode only** in the UI. Discussion Mode was removed from the setup UI; its types remain in `debateTypes.ts` for backward compatibility. Do not resurface it without an explicit request.
- **English-only UI for launch.** Turkish localization is fully built but hidden behind `MULTILOCALE_ENABLED = false` in `src/lib/i18n/config.ts`.
- Remaining pre-launch work is tracked in `docs/18_RELEASE_REQUIREMENTS.md` and `docs/13_ROADMAP.md`.

## Core Product Principle

The AI models must not control the debate flow.

The application controls:

- who speaks next, which round is active, and the task of each round
- when the debate ends (3/5/7 rounds, deterministic plan, no loops)
- whether a judge appears and which model judges
- how costs are calculated
- when the session is complete

The AI models only generate individual turn responses based on strict prompts. The `/report` page renders the actual prompts, model catalog, and pricing from the same source files the API routes use — keep it that way so it cannot drift.

## Current Feature Set

- Topic input with AI topic check/improve (`/api/topic/check`, cheap model)
- Two fighters from 56+ models across OpenAI, DeepSeek, and OpenRouter (free models)
- 3 / 5 / 7 rounds (Quick Match / Ranked Match / Championship)
- Tone per fighter: serious, aggressive, casual, or custom free text
- Response length: short / medium / long; pace: manual or auto
- Deep Debate: web-search-grounded turns with numbered citations (Brave injected search by default; OpenRouter `:online` in hybrid mode)
- Optional judge: auto-selected neutral model or user-picked third model; blind, decisive verdicts with scores
- Per-message and total cost tracking, cache-aware pricing
- Stateless share links (`/s?d=...`) with generated OG images (`/api/og`)
- Community hub (`/community`, `/m/[id]`): publish full matches (public or unlisted) with sharer-controlled privacy (hide model names, exclude verdict — stripped server-side, permanent), crowd side-voting (A/B/tie, sign-in required), flat comments, profile handles + preset avatars (see `docs/20_COMMUNITY.md`)
- Optional Supabase auth (magic link + Google); match history and stats on `/profile`
- Per-IP rate limits and global/per-IP daily spend caps (Supabase RPCs, fail-open)
- Arcade UI: synth SFX, generative background music, sound toggle, mobile-responsive
- Legal pages (`/about`, `/privacy`, `/terms`) and a living tech report (`/report`)

## Repository Map

- `src/app/` — pages (home, setup, debate, result, s, community, m/[id], profile, login, report, legal) and API routes (`api/debate/turn`, `api/debate/verdict`, `api/topic/check`, `api/health`, `api/og`, `api/community/{publish,vote,comment}`)
- `src/lib/debate/` — orchestrator, round plans, prompt builder, verdict parser, validators, citations, topic check
- `src/lib/providers/` — provider interface + OpenAI / DeepSeek / OpenRouter implementations, registry with retry and auto-judge resolution
- `src/lib/models/modelRegistry.ts` — model catalog (display info, cost tiers, debate ratings, Turkish support, web-search capability)
- `src/lib/cost/` — pricing table (`pricing.ts`) and cost calculation
- `src/lib/search/` — injected web search (Brave) behind a search-provider interface
- `src/lib/supabase/` — auth clients, match persistence, stats
- `src/lib/community/` — shared-match types, publish-time snapshot sanitizer, profile presets, community API client
- `src/lib/security/rateLimit.ts` — rate limits and spend caps
- `src/lib/share/` — stateless share-link encoding
- `src/lib/i18n/` — locale config, dictionaries (en/tr), providers
- `src/lib/audio/soundManager.ts` — synth SFX and music
- `src/lib/state/ArenaContext.tsx` — client session/config state
- `docs/` — product and technical reference docs (see `docs/13_ROADMAP.md` for what's next)

## Required Architecture Rules

- Never expose API keys on the frontend; all model calls go through backend API routes.
- Provider integrations use the shared provider interface; the debate engine must not know which provider is in use.
- Pricing lives in `src/lib/cost/pricing.ts`, never in UI components.
- UI components must not contain provider-specific logic.
- Debate orchestration is separated from UI; prompt construction is separated from provider calls.
- Round logic is deterministic; infinite debates are impossible by design.
- Rate limits and spend caps run BEFORE any paid provider work.
- Supabase is optional: the app must keep working signed-out and without Supabase configured (limits fail open).
- The `/report` page must keep rendering from the real source of truth (prompt builder, model registry, pricing).

## Environment Variables

Providers: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`.
Search: `SEARCH_PROVIDER` (default `brave`), `BRAVE_SEARCH_API_KEY`, `SEARCH_COST_USD`, `DEEP_SEARCH_MODE` (`unified` | `hybrid`).
Supabase (optional): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Limits: `RL_WINDOW_SECONDS`, `RL_TURN_PER_MIN`, `RL_VERDICT_PER_MIN`, `RL_TOPIC_PER_MIN`, `RL_PUBLISH_PER_MIN`, `RL_VOTE_PER_MIN`, `RL_COMMENT_PER_MIN`, `SPEND_GLOBAL_DAILY_USD`, `SPEND_IP_DAILY_USD`.

## Development Workflow

The phased MVP build is complete. Work now happens in small, user-approved increments:

- Propose and discuss notable changes before implementing them; do not auto-advance into adjacent work.
- Run `npx tsc --noEmit` (and a build when relevant) before declaring a change done.
- Update the relevant doc in `/docs` when behavior it describes changes.

## Design Direction

The UI must feel like an arcade debate game: dotted grid background, thick black borders, rounded cards, chunky hard shadows, bright colors, playful badges, tactile animated buttons, character-like model cards, cost and round counters, sound toggle. See `docs/02_DESIGN.md` for the full system.

The UI must not look like a corporate SaaS dashboard, a plain chatbot, a generic AI wrapper, or a documentation website.

## Do Not Do

Do not:

- let models decide the next speaker or allow unlimited back-and-forth
- hardcode pricing inside UI components or expose API keys client-side
- mix provider logic with UI
- create vague prompts, let models agree too easily, or let them repeat arguments across rounds
- re-enable Discussion Mode or the Turkish UI without an explicit request
- skip error handling or ignore the mobile layout
- bypass the rate-limit/spend-cap checks on any route that calls a paid provider
