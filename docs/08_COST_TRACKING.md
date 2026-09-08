# 08 — Cost Tracking

> Updated 2026-09-08. Source of truth: `src/lib/cost/pricing.ts` and
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

AI usage cost is tracked and understood internally: every message computes its estimated cost, while per-attempt reservations enforce spend caps independently of session totals (displays are currently hidden — see the banner above).

## Cost Badge

Each message card shows compact cost data (`$0.0031 • 842 tok • 2.4s`); expanded detail shows input/output/cached tokens, per-component cost, and latency.

## Pricing (`pricing.ts`)

- September refresh: Astra and DeepSeek from official docs, OpenRouter from its live model API. Added 13 models and refreshed 19 existing OpenRouter price pairs. Older OpenAI entries retain their prior verified rates. See [the dated audit](26_PROJECT_AUDIT_2026-09-08.md).
- **Cached input discounts** are modeled: 90% for the GPT-5 family, 75% for GPT-4.1, 50% for GPT-4o; DeepSeek has separate cache-hit rates. Prompts are ordered stable-first so caches actually hit (see `docs/05_PROMPTING.md`).
- The selectable OpenRouter catalog is paid-only. Tests require explicit API prices for every selectable model.
- Unknown models fall back to $0.5 input / $1.5 output per 1M.
- Deep Debate uses app-managed Brave search only. `SEARCH_COST_USD` defaults to and cannot reserve below $0.005 per query; raise it for a higher-priced plan. Native provider search is disabled.

DeepSeek uses current peak rates conservatively; off-peak invoices can be lower. Astra cache writes cost $12.50/M input tokens, versus $10/M ordinary input and $1/M cache hits. `TokenUsage.cacheWriteInputTokens` retains provider-reported writes; the calculation bounds them to non-hit input and adds only the write surcharge.

Every actual provider attempt reserves a conservative amount atomically before dispatch. Known usage reconciles once; failures, timeouts and missing usage retain bookings. OpenRouter cost receipts are preferred when available. Ledger values remain tariff estimates, not invoice guarantees. Coin estimates use the cheapest net pack after fee, retry, operating, judge and search allowances; 5× is a planning target, not guaranteed profit. See [audit fixes](27_AUDIT_FIXES_2026-09-08.md).

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
