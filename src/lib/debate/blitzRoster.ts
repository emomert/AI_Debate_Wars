/**
 * The curated Blitz roster. Only models listed here (with available:true) are
 * selectable in Blitz mode; everything else stays in normal Debate mode.
 * `characterKey` names the sprite folder used in Phase 2 — in Phase 1 the stage
 * renders the reusable panel regardless, so the key is forward-declaration only.
 * Owner finalizes the exact set; every id MUST exist in modelRegistry.ts.
 */
import { getModelById } from "@/lib/models/modelRegistry";

export interface BlitzFighter {
  modelId: string;
  characterKey: string;
  available: boolean;
}

export const BLITZ_ROSTER: BlitzFighter[] = [
  { modelId: "deepseek-v4-pro", characterKey: "deepseek-pro", available: true },
  { modelId: "deepseek-v4-flash", characterKey: "deepseek-flash", available: true },
  { modelId: "qwen/qwen3-next-80b-a3b-instruct:free", characterKey: "qwen-next", available: true },
  { modelId: "qwen/qwen3-coder:free", characterKey: "qwen-coder", available: true },
  { modelId: "meta-llama/llama-3.3-70b-instruct:free", characterKey: "llama", available: true },
];

const AVAILABLE = new Set(
  BLITZ_ROSTER.filter((f) => f.available && getModelById(f.modelId)).map((f) => f.modelId),
);

export function isBlitzModel(modelId: string): boolean {
  return AVAILABLE.has(modelId);
}

export function blitzRosterModelIds(): string[] {
  return [...AVAILABLE];
}
