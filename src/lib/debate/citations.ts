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
