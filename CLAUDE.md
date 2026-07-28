# CLAUDE.md

## Project Name

Debator (AI Debate Arena)

## Product Summary

Debator is a gamified web application where users make two AI models debate a topic in a structured, finite match. Users pick a topic, choose two fighters from a large model catalog, set the round count, tone, response length, and pace, optionally enable Deep Debate (web-search-grounded turns with citations) and a neutral AI judge, then watch the match unfold in an arcade-style interface with live per-turn cost tracking.

The desired product feeling is:

> Arcade interface, serious intelligence.

## Current Status

The product is feature-complete and polished, in pre-public-launch state.

- **Debate Mode only in the UI for now.** Blitz Mode is fully built but hidden behind `BLITZ_ENABLED = false` in `src/lib/debate/blitzConfig.ts`: the setup mode toggle is not rendered (Debate is the sole mode) and a persisted `mode: "blitz"` config is coerced back to Debate, so no Blitz session can start. The whole implementation (stage, runner, roster, prompts, pipeline handling) stays intact — flip the flag to bring it back. Discussion Mode was removed from the setup UI; its types remain in `debateTypes.ts` for backward compatibility. Do not resurface Discussion or Blitz without an explicit request.
- **English-only UI for launch.** Turkish localization is fully built but hidden behind `MULTILOCALE_ENABLED = false` in `src/lib/i18n/config.ts`.
- **Fighter Voices hidden for now.** The opt-in 🔊 voice-over (TTS) is fully built but hidden behind `VOICE_ENABLED = false` in `src/lib/tts/config.ts`: the setup voice card, arena HUD voice toggle + cost badge, and per-message play buttons don't render, the `voicePlayer` engine no-ops, and server TTS reports unconfigured so `/api/tts` never fires. This is separate from the arcade audio control (SFX + music share **one combined toggle** since July 12). Flip the flag to bring voices back with no other changes.
- **Launch hardening + UX/accessibility audit (in progress).** Two remediation passes are underway and shipping incrementally to `main`: (1) pre-launch security/trust/cost blockers, and (2) a 109-finding honest UX/a11y audit. Done so far: topic + publish moderation, a spoof-proof rate-limit IP, a Brave metered-billing guard, signed share verdicts (verified/unverified), a reduce-motion/instant-text escape hatch + screen-reader live regions, contrast + tab-semantics + responsive fixes, a `/contact` page + data-controller identity, a report/flag + admin-takedown system, and a signup consent/13+ age gate. **Remaining pre-launch work is tracked in `docs/18_RELEASE_REQUIREMENTS.md` and `docs/13_ROADMAP.md`** (the standalone launch-checklist and UX-audit report files were removed from the repo root once their findings were worked through).
- **July 17 payments wiring (Polar, dark).** Real checkout is BUILT and ships behind `NEXT_PUBLIC_PAYMENTS_ENABLED` (default off — /pricing keeps "coming soon" until the flag + Polar env exist): `GET /api/checkout?pack=N` (rate-limited `checkout` kind, auth-required, pack→product resolved server-side, Supabase user attached as Polar `externalCustomerId`) and `POST /api/webhooks/polar` (signature-verified `order.paid` → `coin_ledger` credit via service role; idempotent on the UNIQUE `order_id` index, 23505 = redelivery; unfixable payloads 200+logged to /admin, infra failures 500 so Polar retries). /pricing shows `?checkout=` status banners and pokes the balance chip (`ada:coins-changed`). Polar re-validated for a GLOBAL audience 7/16 (90+ presentment currencies, TR payouts via Stripe Connect Express; Paddle stays fallback — sub-$10 packs need their sales team). Operator setup/test/go-live steps: `docs/24_PAYMENTS_POLAR_WALKTHROUGH.html`; details in `docs/23_COINS.md`. Refunds v1 = manual (Polar dashboard + `mint-coins.mjs` clawback).
- **July 16 owner round.** (1) The setup **Match Card now has a dedicated "Total cost" row** (coins, across battles, judge included) at the bottom of the card — the old badge-cloud chip was easy to miss; `d.coins.matchCost` was replaced by `totalCostLabel`/`totalCostValue`. (2) **Response length is strictly `short`** — the setup picker (`ResponseLengthSelector`), `LENGTH_OPTIONS`, and the length dict entries were removed; persisted configs are coerced in setup (mirrors the 3-rounds clamp); the engine + validators still accept medium/long so legacy sessions render; the coin "long ×2" multiplier stays in `economy.ts` for legacy but is unreachable from the UI; /pricing copy updated. (3) **"Mistral is slow" root-caused and fixed:** the July catalog expansion blanket-tagged every OpenRouter model with `reasoningEffort: "low"`, but OpenRouter's `reasoning.effort` param only CAPS models that think by default — on opt-in reasoners it SWITCHES THINKING ON (measured: Mistral Medium 0 → 3,577 thinking tokens/turn; Gemma 4 5.8s → 183s hitting the token ceiling). Every OpenRouter model was probed bare vs `effort:"low"`; the tag was removed from 22 opt-in/non-reasoners (Mistral, all Claude, Gemini Flash/Lite, Gemma, Grok 4.20, Llama 4, Nova, Hunyuan, Nemotron Nano/Ultra) and kept on the 17 measured default-on thinkers (Kimi, GLM, Qwen, MiniMax, Xiaomi, Grok 4.3/4.5, Gemini 2.5 Pro, Nemotron Super). Rule going forward: **probe before tagging** (see docs/07). Also: Google approved the OAuth brand — the consent screen now shows the Debator name/logo.
- **July 13 security hardening.** A four-surface audit (coin/payment routes, Supabase RLS/RPCs, injection/XSS/SSRF, secrets) found the app clean except a live coin-economy bypass — now fixed. (1) `coin_spend_match` is reachable over PostgREST and trusted a client-supplied allowance, so a direct call could pre-seed a match's charge or inflate the free bucket: closed by **HMAC-signing charge keys** (`src/lib/coins/chargeKey.ts`; secret = `SUPABASE_SERVICE_ROLE_KEY` or `COIN_CHARGE_SECRET`) so a forged key can't collide with a real match, plus **migration 0013** makes the DB ignore the client allowance. (2) The **judge is now priced at the verdict route from the RESOLVED judge**, keyed on the transcript (`ensureJudgeCharged`) — Auto free, a picked third-model judge charged, re-running the *same* judge free — closing the free-premium-judge bypass (behavior change: re-judging only charges when you **switch** judges, not for an identical re-run). (3) `rl_hit`/`spend_allowed`/`spend_record` were anon-callable (a spoofed `spend_record` could trip the global spend cap for everyone) → **service-role-only** (migration 0013), called via `getSupabaseServiceRoleClient`. (4) `safeNextPath` backslash open-redirect fix, `import "server-only"` on three secret-reading modules, and baseline security headers in `next.config.mjs`. **Coins + the cross-instance rate limiter now require `SUPABASE_SERVICE_ROLE_KEY`** (fail closed / fall back to the in-process backstop without it).
- **July 2026 declutter + paid-catalog pass.** Owner-directed simplification: consistent header width, route fade transitions (`src/app/template.tsx`), Deep Debate folded into the Topic section, minimal fighter picker (nicknames + debate-skill bar removed from UI; `nickname` is now optional/legacy), debate HUD reduced to round/tone/length/pace/skip, default response length `short`. **Cost displays are hidden** behind `COST_UI_ENABLED = false` in `src/lib/cost/uiConfig.ts` (internal cost tracking + spend caps still run). **Moderation is now OPT-IN** — off unless `MODERATION_ENABLED=true` (owner decision; the providers' own safety layers are the gate). The model catalog moved to a **paid OpenRouter account**: all `:free` models removed; Claude/Grok/Gemini/Xiaomi/GLM/Kimi/Nemotron/Qwen/MiniMax added with live-verified ids + pricing; OpenAI updated to the GPT-5.6 family. Only `gpt-5.1-chat-latest` was dropped (OpenAI shutdown 2026-07-23); later-sunset GPT models stay listed until their dates — remove `gpt-5.2/5.3-chat-latest` by Aug 10, `gpt-4.1-nano` by Oct 23, `gpt-5-mini/nano` by Dec 11, 2026. **The judge is mandatory** (setup toggle removed; Auto or Pick-a-Judge only).
- **July 12 coin economy (LIVE) + catalog expansion.** The coin economy is ON by default (`COINS_ENABLED` in `src/lib/coins/config.ts`; kill switch `NEXT_PUBLIC_COINS_ENABLED=false`) — owner launched it before checkout, distributing coins via promo codes + `scripts/mint-coins.mjs` until Polar is wired — see `docs/23_COINS.md`. Coins: explicit per-fighter prices (1/2/4/8/12/20; match = A+B, long ×2, deep +2; AUTO judge free, a PICKED judge adds its coin price, re-judging always costs the judge's price min 1), 15 free coins/day (no rollover; daily coins cover fighters ≤4 coins, premium needs purchased/promo), packs 100/$4.99 · 250/$9.99 · 700/$19.99 (buy buttons disabled until Polar — the NEXT step), `/pricing` + once-per-device tier popup + header balance chip + signed-out START→signup gate, promo codes (mint via `scripts/create-promo.mjs`, redeem on /pricing, guardrails in-DB), migration 0012 (ledger + RPCs, applied live), turn-route charge gate (`ensureMatchCharged`, fails closed), `OUT_OF_COINS` error. `economy.test.ts` enforces a ≥5× margin for every model against pricing.ts. Catalog: +13 OpenRouter models incl. 4 new brand tiles (Meta Llama 4, Mistral, Amazon Nova, Tencent Hunyuan 3) + Claude Haiku 4.5; `gpt-5.2/5.3-chat-latest` removed (Aug 10 sunset). Payments decision (owner): Merchant of Record — Polar first, Paddle fallback; Stripe direct unavailable from Türkiye.
- **July 12 evening polish (owner live-testing round).** Login: subtitle + DeepSeek data note removed, GitHub sign-in removed (disable the Supabase provider too), consent checkbox back to the email-signup form only (Google/magic one-click again, passive notice covers them). Signed-out START shows a "Sign up first" modal instead of redirecting. Coins UX: the tier intro popup was deleted, coin chips use a light-yellow "coin" badge color (emoji visibility), Match Card fighter names wrap instead of truncating, promo question added to /welcome, LAUNCH promo = 100 coins. Profile stats: coin balance + daily-coins tiles replaced rounds-fought/fighters-tried; "Wins by fighter" panel removed. Header: ONE AudioToggle now controls SFX + music together (SoundToggle/MusicToggle deleted); logo emoji optically centered. Verdict card: Copy image + Share match right-aligned under Change-the-judge. Setup: "Run up to 3 battles…" note removed.
- **July 12 feedback pass.** Owner-directed batch: matches are **strictly 3 rounds** (selector removed; persisted configs clamp to 3; legacy 5/7 shared matches still render), GPT-5.4 Mini replaces GPT-4o Mini in the OpenAI picker shortlist + default fighters, home "Try a Sample" replaced by **"See a Demo"** (a full-screen ~30s **real screen recording** of one genuine match — `public/demo/demo-match.mp4` played by `src/components/demo/DemoOverlay.tsx`; regenerate via `scripts/record-demo.mjs` + `scripts/edit-demo.mjs`; skippable), ALL audio (SFX too, not just music) silenced when the tab is hidden, OpenRouter reasoning headroom raised +1300→+2500 plus a one-shot retry at the model's full ceiling on `TOKEN_LIMIT_EXCEEDED` (Kimi-class thinking starved short turns), admin `match_cost` now derived server-side (client cost summary is zero at verdict time), completed matches **auto-save** to signed-in history (manual save button retired), and the 13+/terms checkbox gates Magic Link + Google + GitHub too (remembered per device, keyed by terms version).
- **July 11 polish pass.** Fighter picker is provider-first (one uniform alphabetical grid of company-logo tiles — no provider is promoted; `BrandLogo` everywhere instead of per-model emojis in setup AND the arena cards/bubbles). Fighters are **identity-blind** in prompts ("You"/"Opponent" transcript labels; role only, never model names) — the judge was already blind. Verdict: single center-zero tug-of-war score bar (±50), strongest/weakest tiles retired (also removed from the judge JSON), judge visible budget 2500, and the parser salvages truncated judge JSON (never renders raw JSON). Security: consent moved to `profile_consent` (0008), citation URLs scheme-validated at render/ingest/publish, rate limits fall back to an in-process backstop instead of failing open. Verdict phase merged into ONE card (`VerdictCard`: compact question strip with Pro/Against chips, judge at bottom with an inline change-the-judge expander, share row — colorful X/Instagram/Reddit brand tiles, copy image, and "Share match" which one-click publishes an UNLISTED community copy and copies its /m/&lt;id&gt; link, falling back signed-out to a full-transcript text copy via `lib/share/matchText.ts`; no Copy-link button); the separate SharePanel + FinalSummaryCard ("Match Summary") were deleted. The arena's sticky HUD bar is always solid and docks flush under the header (`GameShell flushTop`).
- Remaining pre-launch work is tracked in `docs/18_RELEASE_REQUIREMENTS.md` and `docs/13_ROADMAP.md`.

## Core Product Principle

The AI models must not control the debate flow.

The application controls:

- who speaks next, which round is active, and the task of each round
- when the debate ends (3/5/7 rounds, deterministic plan, no loops)
- which model judges (a judge always appears — mandatory since July 2026)
- how costs are calculated
- when the session is complete

The AI models only generate individual turn responses based on strict prompts. The `/report` page renders the actual prompts, model catalog, and pricing from the same source files the API routes use — keep it that way so it cannot drift.

## Current Feature Set

- Topic input with AI topic check/improve (`/api/topic/check`, cheap model)
- Two fighters from ~60 paid models across OpenAI (direct, 14), DeepSeek (direct, 2), and OpenRouter (44 — Claude, Grok, Gemini, Xiaomi MiMo, GLM, Kimi, Nemotron, Qwen, MiniMax, Llama, Mistral, Nova, Hunyuan). No free tier; "fast" twin variants are deliberately not added.
- Blitz Mode (currently hidden behind `BLITZ_ENABLED` — see Current Status): a fast 4-round / 8-turn variant on an animated arena stage — per-turn move-tag splashes (OBJECTION/COUNTER/…), buffer-then-stream generation (`useBlitzRunner`), an in-scene verdict, and a curated ~12-model roster (`blitzRoster.ts`). Reuses the debate pipeline; `punchy` length is blitz-internal. Phase 1 ships on the reusable fighter *panel* (bespoke per-model character art is Phase 2).
- Multi-battle: run up to 3 battles on the same topic at once (different or same fighter pairs), all running concurrently — a tab switcher in the arena and results; only the watched battle speaks/sounds; manual pace gates only the watched battle (see `docs/09_UX_FLOWS.md`). Only the fighters differ per battle; all other settings are shared.
- Strictly 3 rounds (July 2026 — the 3/5/7 selector was removed; the engine still renders legacy 5/7 shared/persisted matches)
- Tone per fighter: serious, aggressive, casual, or custom free text — plus a hidden "unhinged" easter-egg tone (5 rapid clicks on Aggressive in setup; profanity-allowed roast battle, hard ban on slurs/hate speech baked into the prompt)
- Response length: short / medium / long; pace: manual or auto
- Deep Debate: web-search-grounded turns with numbered citations (Brave injected search by default; OpenRouter `:online` in hybrid mode). Brave's free tier ended (Feb 2026): `SEARCH_COST_USD` defaults to ~$0.005/query and a hard daily search-count cap (`SEARCH_DAILY_MAX`) backstops the dollar caps.
- Mandatory judge (July 2026 — the setup on/off toggle was removed): auto-selected neutral model or user-picked third model; blind, decisive verdicts with scores. `judge.enabled` remains in the schema for legacy sessions and is coerced to true in setup.
- Topic + published-transcript moderation (`src/lib/moderation/`) — **disabled by default since July 2026**; opt back in with `MODERATION_ENABLED=true`. The profanity-allowed "unhinged" tone is still barred from publishing.
- Per-message and total cost tracking, cache-aware pricing — internal only for now: all cost displays are hidden behind `COST_UI_ENABLED = false` (`src/lib/cost/uiConfig.ts`); spend caps still enforce.
- Optional fighter voices (opt-in 🔊, currently hidden behind `VOICE_ENABLED` — see Current Status): free Web Speech tier always; premium OpenAI speech via `/api/tts` (~$15/1M chars ≈ 13¢/voiced match, reuses `OPENAI_API_KEY`) with automatic fallback (see `docs/21_VOICE.md`)
- Stateless share links (`/s?d=...`) with generated OG images (`/api/og`). The verdict is HMAC-signed at generation (`src/lib/share/signing.ts`); `/s` + OG render verified vs ⚠ unverified to defeat forged share links. Dormant + safe until `SHARE_SECRET` is set.
- Community hub (`/community`, `/m/[id]`): publish full matches (public or unlisted) with sharer-controlled privacy (hide model names, exclude verdict — stripped server-side, permanent), crowd side-voting (A/B/tie — built but **hidden** behind `VOTING_ENABLED = false` in `src/lib/community/config.ts` since July 2026), flat comments, profile handles + preset avatars, and a **report/flag** path on matches + comments with an operator admin-takedown script (see `docs/20_COMMUNITY.md`)
- Optional Supabase auth (magic link + Google); a signup consent + **13+ age gate** (recorded in the private, own-rows-only `profile_consent` table — moved OFF the world-readable profiles row in migration 0008), match history/stats on `/profile`, and self-serve account deletion + JSON data export (`delete_my_account` cascade RPC, migration 0007)
- Per-IP rate limits (spoof-proof trusted IP) and global/per-IP daily spend caps (Supabase RPCs; when Supabase is down/unconfigured they fall back to an in-process per-instance backstop, not fully open)
- Arcade UI: synth SFX + generative background music behind **one combined audio toggle** (July 12 — flips both together), a **reduce-motion / instant-text** toggle + OS `prefers-reduced-motion` support, screen-reader live regions, mobile-responsive
- Legal pages (`/about`, `/privacy`, `/terms`, `/contact`) with a named operator / data-controller identity and governing-law clause (values are placeholders in `src/lib/legal/identity.ts` — set before launch), and a living tech report (`/report`)
- Owner analytics (July 2026): a dimensions-only "match card" (NO topic/transcript/custom-tone text) written server-side at verdict time + an owner-only `/admin` dashboard (model picks, judge choices, counts, cost). Gated by `SUPABASE_SERVICE_ROLE_KEY` + `ADMIN_USER_IDS`; see `docs/22_ANALYTICS.md`

## Repository Map

- `src/app/` — pages (home, setup, debate, result, s, community, m/[id], profile, login, welcome, report, contact, legal) and API routes (`api/debate/{turn,verdict}`, `api/topic/check`, `api/health`, `api/og`, `api/tts`, `api/community/{publish,vote,comment,report}`)
- `src/lib/debate/` — orchestrator, round plans, prompt builder, verdict parser, validators, citations, topic check
- `src/lib/providers/` — provider interface + OpenAI / DeepSeek / OpenRouter implementations, registry with retry and auto-judge resolution
- `src/lib/models/modelRegistry.ts` — model catalog (display info, cost tiers, debate ratings, Turkish support, web-search capability)
- `src/lib/cost/` — pricing table (`pricing.ts`) and cost calculation
- `src/lib/search/` — injected web search (Brave) behind a search-provider interface
- `src/lib/supabase/` — auth clients, match persistence, stats
- `src/lib/analytics/` — dimensions-only match "cards" (no content): builder, pure aggregation, server writer (service-role)
- `src/lib/admin/access.ts` — `ADMIN_USER_IDS` allowlist gate for `/admin`
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
- Moderation is OPT-IN (July 2026): the `omni-moderation` gate on topics + published transcripts only runs when `MODERATION_ENABLED=true`; when enabled it still fails open. Do not re-enable by default without an explicit request.
- Shareable verdicts are HMAC-signed server-side; `/s` and the OG image must never present an unsigned/forged verdict as verified.
- Honor reduced motion (OS flag or the in-app toggle): no infinite/continuous animation, and reveal turns instantly when it's set — see `src/lib/motion/`.
- Supabase is optional: the app must keep working signed-out and without Supabase configured. Without Supabase the rate/spend caps fall back to an in-process per-instance backstop (`src/lib/security/rateLimit.ts`) rather than failing fully open — keep that backstop when touching the limiter.
- The `/report` page must keep rendering from the real source of truth (prompt builder, model registry, pricing).

## Environment Variables

Providers: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`.
Search: `SEARCH_PROVIDER` (default `brave`), `BRAVE_SEARCH_API_KEY`, `SEARCH_COST_USD` (default ~`0.005`/query), `SEARCH_DAILY_MAX` (hard daily search-count cap, default 2000), `DEEP_SEARCH_MODE` (`unified` | `hybrid`).
Moderation: OFF by default; `MODERATION_ENABLED=true` (plus `OPENAI_API_KEY`) enables, `MODERATION_MODEL` (default `omni-moderation-latest`).
Coins: ON by default (UI + turn-route charging); `NEXT_PUBLIC_COINS_ENABLED=false` is the kill switch (build-time inlined — needs a redeploy). Charging now signs its idempotency keys with `SUPABASE_SERVICE_ROLE_KEY` (or the optional `COIN_CHARGE_SECRET` override) — **coins fail closed without one of them set** (see July 13 hardening).
Payments (Polar, server-only except the flag): `POLAR_ACCESS_TOKEN` (org access token), `POLAR_WEBHOOK_SECRET` (endpoint signing secret), `POLAR_SERVER` (`sandbox` | `production`), `POLAR_PRODUCT_100`/`POLAR_PRODUCT_250`/`POLAR_PRODUCT_700` (product ids), `NEXT_PUBLIC_PAYMENTS_ENABLED` (build-time UI flag — buy buttons render only when `true`), `RL_CHECKOUT_PER_MIN`.
Sharing: `SHARE_SECRET` — HMAC key for signing share verdicts. Unset = signing dormant (shares render normally, never falsely "verified"). **Set a strong random value in prod to activate verification.**
Voice: `TTS_PROVIDER` (`none` disables; otherwise on whenever `OPENAI_API_KEY` is set), `TTS_OPENAI_MODEL` (default `gpt-4o-mini-tts`), `TTS_SPEED` (0.25–4.0, default 1.3), `TTS_COST_USD_PER_1M` (price override), `RL_TTS_PER_MIN`.
Supabase (optional): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Admin/migrations (server-only, never client): `SUPABASE_DB_URL`.
Analytics/admin + security (server-only): `SUPABASE_SERVICE_ROLE_KEY` — enables the dimensions-only match-analytics writer + admin dashboard, **signs coin charge keys, and is the caller identity for the service-role-only rate-limit/spend RPCs** (never expose to the client); `COIN_CHARGE_SECRET` (optional override for the charge-key HMAC); `ADMIN_USER_IDS` (comma-separated Supabase user ids allowed to view `/admin`).
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
