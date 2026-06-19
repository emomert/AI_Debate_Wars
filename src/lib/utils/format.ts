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

/**
 * A short relative timestamp ("just now", "3 days ago"), falling back to a stable
 * YYYY-MM-DD past ~30 days. Pair with a <time dateTime={iso}> element for
 * machine-readability. Locale is pinned to "en" so server-rendered output is
 * stable (the UI is English-only for launch).
 */
export function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso.slice(0, 10);
  const sec = Math.round((Date.now() - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hr = Math.round(min / 60);
  if (hr < 24) return rtf.format(-hr, "hour");
  const day = Math.round(hr / 24);
  if (day < 30) return rtf.format(-day, "day");
  return new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD
}
