/**
 * Deep Debate citation helpers (pure, no provider/UI knowledge).
 */

import type { Citation } from "@/lib/debate/debateTypes";

// OpenRouter bills ~$0.005 per web search (Exa engine). Used for the Deep Debate
// cost line so a "free" model's turn doesn't read $0.00 while search is charged.
export const DEEP_SEARCH_COST_USD = 0.005;

/**
 * Citation-integrity guard: remove inline [n] markers that don't map to a real
 * returned source (n out of range), so a model can't render fake citation links
 * to sources it never actually had. ONLY run on Deep Debate turns (a normal turn
 * might legitimately contain "[10]" prose).
 */
export function stripOrphanCitationMarkers(
  content: string,
  citations: Citation[] | undefined,
): string {
  const count = citations?.length ?? 0;
  return content
    // Consume an optional leading space with the marker so dropping an orphan
    // doesn't leave a double space or a space before punctuation.
    .replace(/ ?\[(\d{1,3})\]/g, (full, numStr: string) => {
      const n = Number(numStr);
      return n >= 1 && n <= count ? full : "";
    })
    .replace(/ {2,}/g, " ")
    .replace(/ ([.,;:!?])/g, "$1");
}

/**
 * Citation honesty for the injected-search path: the route hands the model a
 * fixed source list, but the message should only claim the sources the model
 * actually cited — otherwise "Sources · 5" overstates a turn that cited two.
 * Keeps cited sources in order of first inline appearance, renumbering both
 * the [n] markers and the citation indices to a contiguous 1..k. Run AFTER
 * stripOrphanCitationMarkers (markers are guaranteed in-range here).
 * Returns `citations: undefined` when nothing was cited.
 */
export function narrowCitationsToCited(
  content: string,
  citations: Citation[] | undefined,
): { content: string; citations: Citation[] | undefined } {
  const count = citations?.length ?? 0;
  if (!citations || count === 0) return { content, citations: undefined };

  const order: number[] = [];
  const remap = new Map<number, number>();
  for (const m of content.matchAll(/\[(\d{1,3})\]/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= count && !remap.has(n)) {
      remap.set(n, order.length + 1);
      order.push(n);
    }
  }
  if (order.length === 0) return { content, citations: undefined };
  if (order.length === count && order.every((n, i) => n === i + 1)) {
    return { content, citations }; // everything cited, already in order
  }

  const renumbered = content.replace(/\[(\d{1,3})\]/g, (full, numStr: string) => {
    const mapped = remap.get(Number(numStr));
    return mapped ? `[${mapped}]` : full;
  });
  const narrowed = order.map((oldIndex, i) => {
    const source = citations.find((c) => c.index === oldIndex) ?? citations[oldIndex - 1];
    return { ...source, index: i + 1 };
  });
  return { content: renumbered, citations: narrowed };
}
