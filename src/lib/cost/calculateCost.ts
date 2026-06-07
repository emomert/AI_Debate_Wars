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
  const inputCost = (usage.inputTokens / 1_000_000) * price.inputCostPer1M;
  const outputCost = (usage.outputTokens / 1_000_000) * price.outputCostPer1M;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: "USD",
    estimated,
  };
}

/** Build a usage object, estimating output tokens from text if not provided. */
export function buildUsage(
  inputTokens: number,
  outputTokens: number,
): TokenUsage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
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
