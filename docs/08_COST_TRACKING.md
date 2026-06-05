# 08 — Cost Tracking

## Goal

The app should make AI usage cost visible, understandable, and transparent.

Every generated message should show estimated cost.

The debate HUD should show total cost.

## Why Cost Tracking Matters

Cost visibility:

- builds trust
- helps users compare models
- prevents surprise API spend
- makes the game feel measurable
- creates a score-like mechanic

## Cost Badge

Each message card should show:

```text
$0.0031 • 842 tok • 2.4s
```

Expanded detail can show:

- input tokens
- output tokens
- total tokens
- input cost
- output cost
- model pricing
- latency

## Pricing Storage

Pricing must be stored in a configurable file.

Example:

```ts
export const modelPricing = {
  "openai:gpt-4.1-mini": {
    inputCostPer1M: 0,
    outputCostPer1M: 0
  },
  "deepseek:deepseek-chat": {
    inputCostPer1M: 0,
    outputCostPer1M: 0
  }
};
```

Before production, fill with latest provider pricing.

Do not hardcode pricing inside UI components.

## Cost Formula

```ts
inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
outputCost = (outputTokens / 1_000_000) * outputCostPer1M;
totalCost = inputCost + outputCost;
```

## CostBreakdown Type

```ts
export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: "USD";
}
```

## Unknown Usage Fallback

Some provider responses may not return token usage in streaming mode.

Fallback options:

1. estimate tokens from text length
2. show “estimated”
3. calculate after stream if provider returns usage at end

UI should indicate:

```text
Estimated cost
```

when not exact.

## Total Debate Cost

Session should track:

```ts
export interface SessionCostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  currency: "USD";
}
```

## Cost Controls

MVP should include:

- max output tokens per response
- max rounds
- optional max session cost later
- stop debate button

Future controls:

- per-user monthly limit
- paywall
- credit system
- model price warnings

## UX Rules

Cost should be visible but not scary.

Good:

- compact badge
- hover for detail
- total cost in HUD
- final cost summary

Bad:

- huge scary warnings
- hiding costs
- technical pricing tables on the main page

## Cost Tracking Acceptance Criteria

Cost tracking is acceptable if:

- every message has cost metadata
- total debate cost is visible
- pricing is configurable
- costs are not hardcoded in UI
- unknown usage is handled gracefully
