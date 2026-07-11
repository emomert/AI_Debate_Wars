# 01 — Product Requirements Document

> Updated 2026-06-10 to describe the product as built. The original MVP-era PRD
> (Discussion Mode, mock providers, two-provider scope) is superseded.

## Product Name

Debator (AI Debate Arena)

## Problem

Users want to evaluate ideas, compare AI models, or explore both sides of an argument. Chat interfaces produce one answer at a time, and model comparison tools are technical, static, and boring. Debator makes structured two-model debate engaging, transparent (costs visible), and useful (judge verdicts, citations).

## Core Features (as built)

### Topic Input + AI Topic Check

- Large topic input with sample topics and validation.
- "Improve topic" button: a cheap model (`/api/topic/check`) rates the topic (good / weak / unclear) and suggests up to 3 sharper alternatives.

### Fighters (Model Selection)

- Two fighters chosen from a catalog of 56+ models across three providers:
  - **OpenAI** (GPT-5.x, GPT-4.x families)
  - **DeepSeek** (V4 Pro, V4 Flash)
  - **OpenRouter** (21+ free models: Qwen, Llama, Kimi, GLM, Gemma, …)
- Each model card shows brand, family, nickname, color, cost tier (FREE / $ / $$ / $$$), and a debate-suitability rating.
- A/B sides can be swapped; the picker groups models by brand and family.

### Match Rules

- **Rounds:** 3 (Quick Match), 5 (Ranked Match), or 7 (Championship). Each maps to a deterministic round plan; no infinite mode exists.
- **Tone:** serious, aggressive, casual, or custom free text — configurable per fighter.
- **Response length:** short (100–160 words), medium (180–300), long (350–600).
- **Pace:** manual (user clicks each turn) or auto-play.

### Deep Debate (web search)

- Optional. Fighters receive injected web-search results and must cite sources as numbered references ([1], [2], …).
- Default "unified" mode: the app runs Brave searches for every fighter so citations are comparable across brands. "Hybrid" mode (`DEEP_SEARCH_MODE=hybrid`) lets OpenRouter models search natively via `:online`.
- Citation chips in the UI open a source viewer; orphan markers are stripped server-side.

### Judge Mode

- Options: no judge, **auto** (a neutral, cheap-but-capable model is selected automatically), or a user-picked **third model**.
- Using fighter A or B as judge was removed from the UI for neutrality (types remain for backward compatibility).
- The judge evaluates the transcript **blind** (model names hidden) and returns a decisive verdict: winner, 0–100 scores (shown as a single center-zero tug-of-war bar), the decisive winning argument, and winner-leaning reasoning. (Strongest/weakest per side were retired July 2026.)
- The judge can be changed and the match re-judged from the result screen.

### Live Debate Page

- Top HUD: topic, round counter, fighters, total cost, sound toggle, stop button.
- Fighter cards with thinking/speaking states; rotating playful "thinking" messages.
- Typewriter text reveal per turn; cost badge (cost • tokens • latency) under each message.
- Synth SFX and generative background music (toggleable).

### Result, Sharing, History

- Result page with verdict reveal (drum roll) as one merged card: question, sides, verdict + scores, judge with inline re-judge, and the share row (social logos, copy link/image, full-text "Share match").
- **Stateless share links:** the verdict is base64url-encoded into the URL (`/s?d=...`) — no database needed. Links auto-unfurl with a generated 1200×630 OG image (`/api/og`).
- **Optional accounts** (Supabase: magic link + Google). Signed-in users can save matches and see history + headline stats on `/profile`. The app is fully usable signed out.

### Cost Tracking

- Per-message: input/output tokens, cached-input savings, search fees, latency, USD cost.
- Pricing is verified against provider pricing pages and lives in `src/lib/cost/pricing.ts`; prompts are ordered to be cache-friendly.
- Session totals in the HUD and result page.

### Abuse / Cost Protection

- Per-IP rate limits on turn, verdict, and topic-check routes.
- Global and per-IP daily spend caps. All checks run before any paid provider call. See `docs/11_SECURITY_RATE_LIMITS.md`.

### Other Pages

- `/about`, `/privacy`, `/terms` — legal pages.
- `/report` — living technical report: the real prompts, model catalog, and pricing rendered from the same source files the API routes use.

## Internationalization

- English is the launch language. Turkish UI, dictionaries, prompt addendum, and Turkish-fluency model filtering are fully built but hidden behind `MULTILOCALE_ENABLED = false`.

## Error Handling

Normalized error codes (missing key, timeout, provider error, rate limited, …) surface as playful but useful messages, with retries on transient provider failures.

## Out of Scope (current)

- Real streaming (turns return as one response; the typewriter reveal is client-side)
- Payments / subscriptions (planned — see `docs/18_RELEASE_REQUIREMENTS.md`)
- Multiplayer, leaderboards, public galleries
- Discussion Mode (removed from UI)
- Custom user system prompts (prompts are framework-locked by design)

## UX Philosophy

The product should create the feeling of:

- "I am setting up a match."
- "I am watching two AI fighters."
- "The debate is progressing through rounds."
- "There will be a clear ending."
- "I can see what this costs."
- "This is fun, but still useful."
