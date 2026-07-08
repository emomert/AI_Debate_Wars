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
- **Fighter Voices hidden for now.** The opt-in 🔊 voice-over (TTS) is fully built but hidden behind `VOICE_ENABLED = false` in `src/lib/tts/config.ts`: the setup voice card, arena HUD voice toggle + cost badge, and per-message play buttons don't render, the `voicePlayer` engine no-ops, and server TTS reports unconfigured so `/api/tts` never fires. This is separate from the arcade SFX/music toggles, which stay available (background music now defaults **off**, matching SFX). Flip the flag to bring voices back with no other changes.
- **Launch hardening + UX/accessibility audit (in progress).** Two remediation passes are underway and shipping incrementally to `main`: (1) pre-launch security/trust/cost blockers, and (2) a 109-finding honest UX/a11y audit. Done so far: topic + publish moderation, a spoof-proof rate-limit IP, a Brave metered-billing guard, signed share verdicts (verified/unverified), a reduce-motion/instant-text escape hatch + screen-reader live regions, contrast + tab-semantics + responsive fixes, a `/contact` page + data-controller identity, a report/flag + admin-takedown system, and a signup consent/13+ age gate. **The single tracker for what's done and what remains is `Debator-Launch-Checklist.md`** (the full audit findings live in `Debator-UX-Inspection-Report.html`).
- Remaining pre-launch work is tracked in `Debator-Launch-Checklist.md` (plus `docs/18_RELEASE_REQUIREMENTS.md` and `docs/13_ROADMAP.md`).

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
- Multi-battle: run up to 3 battles on the same topic at once (different or same fighter pairs), all running concurrently — a tab switcher in the arena and results; only the watched battle speaks/sounds; manual pace gates only the watched battle (see `docs/09_UX_FLOWS.md`). Only the fighters differ per battle; all other settings are shared.
- 3 / 5 / 7 rounds (Quick Match / Ranked Match / Championship)
- Tone per fighter: serious, aggressive, casual, or custom free text — plus a hidden "unhinged" easter-egg tone (5 rapid clicks on Aggressive in setup; profanity-allowed roast battle, hard ban on slurs/hate speech baked into the prompt)
- Response length: short / medium / long; pace: manual or auto
- Deep Debate: web-search-grounded turns with numbered citations (Brave injected search by default; OpenRouter `:online` in hybrid mode). Brave's free tier ended (Feb 2026): `SEARCH_COST_USD` defaults to ~$0.005/query and a hard daily search-count cap (`SEARCH_DAILY_MAX`) backstops the dollar caps.
- Optional judge: auto-selected neutral model or user-picked third model; blind, decisive verdicts with scores
- Topic + published-transcript moderation: every user topic runs through OpenAI's free `omni-moderation` before any paid provider call and again at community publish; the profanity-allowed "unhinged" tone is barred from publishing (`src/lib/moderation/`).
- Per-message and total cost tracking, cache-aware pricing
- Optional fighter voices (opt-in 🔊, currently hidden behind `VOICE_ENABLED` — see Current Status): free Web Speech tier always; premium OpenAI speech via `/api/tts` (~$15/1M chars ≈ 13¢/voiced match, reuses `OPENAI_API_KEY`) with automatic fallback (see `docs/21_VOICE.md`)
- Stateless share links (`/s?d=...`) with generated OG images (`/api/og`). The verdict is HMAC-signed at generation (`src/lib/share/signing.ts`); `/s` + OG render verified vs ⚠ unverified to defeat forged share links. Dormant + safe until `SHARE_SECRET` is set.
- Community hub (`/community`, `/m/[id]`): publish full matches (public or unlisted) with sharer-controlled privacy (hide model names, exclude verdict — stripped server-side, permanent), crowd side-voting (A/B/tie, sign-in required), flat comments, profile handles + preset avatars, and a **report/flag** path on matches + comments with an operator admin-takedown script (see `docs/20_COMMUNITY.md`)
- Optional Supabase auth (magic link + Google); a signup consent + **13+ age gate** (recorded on the profile), match history/stats on `/profile`, and self-serve account deletion + JSON data export (`delete_my_account` cascade RPC, migration 0007)
- Per-IP rate limits (spoof-proof trusted IP) and global/per-IP daily spend caps (Supabase RPCs, fail-open)
- Arcade UI: synth SFX, generative background music (off by default), sound toggle, a **reduce-motion / instant-text** toggle + OS `prefers-reduced-motion` support, screen-reader live regions, mobile-responsive
- Legal pages (`/about`, `/privacy`, `/terms`, `/contact`) with a named operator / data-controller identity and governing-law clause (values are placeholders in `src/lib/legal/identity.ts` — set before launch), and a living tech report (`/report`)

## Repository Map

- `src/app/` — pages (home, setup, debate, result, s, community, m/[id], profile, login, welcome, report, contact, legal) and API routes (`api/debate/{turn,verdict}`, `api/topic/check`, `api/health`, `api/og`, `api/tts`, `api/community/{publish,vote,comment,report}`)
- `src/lib/debate/` — orchestrator, round plans, prompt builder, verdict parser, validators, citations, topic check
- `src/lib/providers/` — provider interface + OpenAI / DeepSeek / OpenRouter implementations, registry with retry and auto-judge resolution
- `src/lib/models/modelRegistry.ts` — model catalog (display info, cost tiers, debate ratings, Turkish support, web-search capability)
- `src/lib/cost/` — pricing table (`pricing.ts`) and cost calculation
- `src/lib/search/` — injected web search (Brave) behind a search-provider interface
- `src/lib/supabase/` — auth clients, match persistence, stats
- `src/lib/community/` — shared-match types, publish-time snapshot sanitizer, profile presets, community API client
- `src/lib/security/rateLimit.ts` — rate limits, daily spend caps, trusted client IP, and the Brave search-count cap
- `src/lib/moderation/` — OpenAI `omni-moderation` gate (topics + published transcripts), fail-open
- `src/lib/share/` — stateless share-link encoding + `signing.ts` (HMAC verdict signatures)
- `src/lib/motion/` — reduce-motion preference store + `useReduceMotion` hook (OS flag OR in-app toggle)
- `src/lib/legal/identity.ts` — operator / data-controller identity (placeholders; set before launch)
- `src/lib/i18n/` — locale config, dictionaries (en/tr), providers
- `src/lib/audio/soundManager.ts` — synth SFX and music (both off by default)
- `src/lib/state/ArenaContext.tsx` — client session/config state
- `scripts/` — node+pg admin tooling: `apply-migrations.mjs` (applies SQL migrations via `SUPABASE_DB_URL`), `admin-takedown.mjs` (remove reported content)
- `supabase/migrations/` — SQL migrations 0001–0007 (matches, match guards, rate limits, social/community, consent, reports, account deletion)
- `docs/` — product and technical reference docs (see `docs/13_ROADMAP.md` for what's next)

## Required Architecture Rules

- Never expose API keys on the frontend; all model calls go through backend API routes.
- Provider integrations use the shared provider interface; the debate engine must not know which provider is in use.
- Pricing lives in `src/lib/cost/pricing.ts`, never in UI components.
- UI components must not contain provider-specific logic.
- Debate orchestration is separated from UI; prompt construction is separated from provider calls.
- Round logic is deterministic; infinite debates are impossible by design.
- Rate limits and spend caps run BEFORE any paid provider work.
- User topics are moderated (free `omni-moderation`) before any paid provider call; published transcripts are moderated before they go public. Both fail open.
- Shareable verdicts are HMAC-signed server-side; `/s` and the OG image must never present an unsigned/forged verdict as verified.
- Honor reduced motion (OS flag or the in-app toggle): no infinite/continuous animation, and reveal turns instantly when it's set — see `src/lib/motion/`.
- Supabase is optional: the app must keep working signed-out and without Supabase configured (limits fail open).
- The `/report` page must keep rendering from the real source of truth (prompt builder, model registry, pricing).

## Environment Variables

Providers: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`.
Search: `SEARCH_PROVIDER` (default `brave`), `BRAVE_SEARCH_API_KEY`, `SEARCH_COST_USD` (default ~`0.005`/query), `SEARCH_DAILY_MAX` (hard daily search-count cap, default 2000), `DEEP_SEARCH_MODE` (`unified` | `hybrid`).
Moderation: on whenever `OPENAI_API_KEY` is set; `MODERATION_ENABLED=false` disables, `MODERATION_MODEL` (default `omni-moderation-latest`).
Sharing: `SHARE_SECRET` — HMAC key for signing share verdicts. Unset = signing dormant (shares render normally, never falsely "verified"). **Set a strong random value in prod to activate verification.**
Voice: `TTS_PROVIDER` (`none` disables; otherwise on whenever `OPENAI_API_KEY` is set), `TTS_OPENAI_MODEL` (default `gpt-4o-mini-tts`), `TTS_SPEED` (0.25–4.0, default 1.3), `TTS_COST_USD_PER_1M` (price override), `RL_TTS_PER_MIN`.
Supabase (optional): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Admin/migrations (server-only, never client): `SUPABASE_DB_URL`.
Limits: `RL_WINDOW_SECONDS`, `RL_TURN_PER_MIN`, `RL_VERDICT_PER_MIN`, `RL_TOPIC_PER_MIN`, `RL_PUBLISH_PER_MIN`, `RL_VOTE_PER_MIN`, `RL_COMMENT_PER_MIN`, `RL_REPORT_PER_MIN`, `RL_OG_PER_MIN`, `SPEND_GLOBAL_DAILY_USD`, `SPEND_IP_DAILY_USD`.

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
