/**
 * Display formatters for cost, tokens and latency. Kept UI-agnostic so the same
 * formatting is used in badges, HUD and the final summary.
 */

/** Formats a USD cost. Very small costs keep extra precision so they aren't $0.00. */
export function formatCost(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return "$0.0000";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/** Compact token count, e.g. 842 -> "842 tok", 1240 -> "1.2k tok". */
export function formatTokens(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return "0 tok";
  if (tokens < 1000) return `${Math.round(tokens)} tok`;
  return `${(tokens / 1000).toFixed(1)}k tok`;
}

/** Latency in ms -> "2.4s" or "640ms". */
export function formatLatency(ms?: number): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Compact one-line cost badge string: "$0.0031 • 842 tok • 2.4s". */
export function costBadgeText(cost: number, tokens: number, latencyMs?: number): string {
  return `${formatCost(cost)} • ${formatTokens(tokens)} • ${formatLatency(latencyMs)}`;
}
