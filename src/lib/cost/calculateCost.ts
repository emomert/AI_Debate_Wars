/**
 * Cost calculation (docs/08_COST_TRACKING.md). Pure functions, no UI, no
 * provider knowledge beyond the pricing table.
 */

import type {
  CostBreakdown,
  DebateMessage,
  DebateSession,
  SessionCostSummary,
  TokenUsage,
} from "@/lib/debate/debateTypes";
import { getModelPrice } from "@/lib/cost/pricing";

/**
 * Rough token estimate from text length, used as a fallback when a provider
 * does not report usage (e.g. some streaming responses). ~4 chars per token.
 */
export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.round(text.trim().length / 4));
}

export function calculateCost(
  providerId: string,
  modelId: string,
  usage: TokenUsage,
  estimated = false,
): CostBreakdown {
  const price = getModelPrice(providerId, modelId);
  // Cache-aware: the cache-hit portion of input bills at the discounted rate, so
  // the displayed cost matches what the provider actually charged. Falls back to
  // the standard input rate when a model has no published cached rate.
  const cachedRate = price.cachedInputCostPer1M ?? price.inputCostPer1M;
  const cachedInput = Math.min(Math.max(usage.cachedInputTokens ?? 0, 0), usage.inputTokens);
  const uncachedInput = usage.inputTokens - cachedInput;
  const inputCost =
    (uncachedInput / 1_000_000) * price.inputCostPer1M +
    (cachedInput / 1_000_000) * cachedRate;
  const outputCost = (usage.outputTokens / 1_000_000) * price.outputCostPer1M;
  // What the cache discount actually saved (vs billing the cached tokens at the
  // full rate). 0 for models priced without a cached rate, so the UI only shows
  // a "saved" marker when a discount was genuinely applied.
  const cachedSavings = (cachedInput / 1_000_000) * (price.inputCostPer1M - cachedRate);
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: "USD",
    estimated,
    ...(cachedSavings > 0 ? { cachedSavings } : {}),
  };
}

/** Build a usage object, estimating output tokens from text if not provided. */
export function buildUsage(
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens = 0,
): TokenUsage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    ...(cachedInputTokens > 0 ? { cachedInputTokens } : {}),
  };
}

/** Aggregate per-message usage/cost into a session-level summary. */
export function summarizeSessionCost(messages: DebateMessage[]): SessionCostSummary {
  return messages.reduce<SessionCostSummary>(
    (acc, m) => {
      if (m.usage) {
        acc.totalInputTokens += m.usage.inputTokens;
        acc.totalOutputTokens += m.usage.outputTokens;
        acc.totalTokens += m.usage.totalTokens;
      }
      if (m.cost) {
        acc.totalCost += m.cost.totalCost;
      }
      return acc;
    },
    {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      currency: "USD",
    },
  );
}

export const EMPTY_COST_SUMMARY: SessionCostSummary = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  totalCost: 0,
  currency: "USD",
};

/**
 * Session cost summary including the judge verdict's usage/cost — and any
 * verdicts replaced by a post-match re-judge, since those were paid for too.
 */
export function recomputeCostSummary(session: DebateSession): SessionCostSummary {
  const base = summarizeSessionCost(session.messages);
  for (const verdict of [...(session.pastVerdicts ?? []), session.verdict]) {
    if (verdict?.usage && verdict.cost) {
      base.totalInputTokens += verdict.usage.inputTokens;
      base.totalOutputTokens += verdict.usage.outputTokens;
      base.totalTokens += verdict.usage.totalTokens;
      base.totalCost += verdict.cost.totalCost;
    }
  }
  return base;
}
