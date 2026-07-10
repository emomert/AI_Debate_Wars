# 08 — Cost Tracking

> Updated 2026-07-11. Source of truth: `src/lib/cost/pricing.ts` and
> `src/lib/cost/calculateCost.ts`. The `/report` page renders the live pricing
> table.
>
> **Cost UI currently HIDDEN** behind `COST_UI_ENABLED = false` in
> `src/lib/cost/uiConfig.ts` (owner decision, July 2026): the HUD money pill,
> per-message cost badge, result cost summary, multi-battle total and profile
> spend stats are not rendered. The cost ENGINE below still runs in full —
> spend caps, persisted summaries and `/report` pricing depend on it. Flip the
> flag to bring every display back.

## Goal

AI usage cost is tracked and understood internally: every message computes its estimated cost, and session totals feed the spend caps (displays are currently hidden — see the banner above).

## Cost Badge

Each message card shows compact cost data (`$0.0031 • 842 tok • 2.4s`); expanded detail shows input/output/cached tokens, per-component cost, and latency.

## Pricing (`pricing.ts`)

- Rates are **verified against official provider pricing pages** (last pass June 2026) and stored per model: input / cached-input / output USD per 1M tokens.
- **Cached input discounts** are modeled: 90% for the GPT-5 family, 75% for GPT-4.1, 50% for GPT-4o; DeepSeek has separate cache-hit rates. Prompts are ordered stable-first so caches actually hit (see `docs/05_PROMPTING.md`).
- OpenRouter free models are $0/$0.
- Unknown models fall back to $0.5 input / $1.5 output per 1M.
- Deep Debate adds a per-search fee: `DEEP_SEARCH_COST_USD` (~$0.005) for OpenRouter native search; injected Brave search costs `SEARCH_COST_USD` (default $0 on the free tier).

Pricing never lives in UI components.

## Calculation (`calculateCost.ts`)

- `buildUsage(...)` constructs `TokenUsage` from the provider response, estimating from text length when the provider reports nothing (flagged as estimated in the UI).
- `calculateCost(providerId, modelId, usage)` returns a `CostBreakdown`: inputCost, outputCost, cachedSavings, searchCost, totalCost (USD).

## Session Totals

The session aggregates total input/output tokens and total cost; shown in the HUD, the result page, and saved with the match.

## Cost Controls

- Max output tokens per turn and fixed round counts bound every match.
- Per-IP rate limits and global/per-IP **daily spend caps** are enforced before any paid call, and every paid call records its spend (`docs/11_SECURITY_RATE_LIMITS.md`).
- Stop button ends a match at any time.

## UX Rules

Costs are visible but not scary: compact badges, expandable detail, HUD total, final summary. No huge warnings, no hidden costs, no raw pricing tables outside `/report`.
