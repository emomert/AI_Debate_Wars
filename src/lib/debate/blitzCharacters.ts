/**
 * Blitz character art contract.
 *
 * Each roster fighter can ship a set of static poses that the cinematic stage
 * cuts between — no video, no sprite sheets, just a handful of stills driven by
 * camera direction. Until a character's art exists, the stage renders an
 * intentional placeholder hero (see CharacterShot), so the choreography works
 * with zero art. Drop art in under `public/blitz/<characterKey>/<pose>.webp` and
 * register it in `BLITZ_CHARACTER_ART` — no component change needed.
 *
 * Trademark rule (from the design spec): characters are Debator's OWN original
 * fighters, loosely themed to each model — never the providers' logos-as-faces.
 */

/** The fixed pose set. Keep this list stable — it IS the art delivery contract. */
export type BlitzPose = "idle" | "talk" | "attack" | "shock" | "win" | "lose";

export const BLITZ_POSES: readonly BlitzPose[] = [
  "idle",
  "talk",
  "attack",
  "shock",
  "win",
  "lose",
];

interface BlitzCharacterArt {
  /** Maps a pose to its image path under /public. Partial: missing poses fall
   *  back to `idle`, then to the placeholder hero. */
  poses: Partial<Record<BlitzPose, string>>;
}

/**
 * Registry: modelId → art. EMPTY for now (Phase 2 art is produced against the
 * spec and added here). An unregistered model renders the placeholder hero.
 *
 * Example once art exists:
 *   "deepseek-v4-pro": { poses: {
 *     idle: "/blitz/deepseek-pro/idle.webp",
 *     talk: "/blitz/deepseek-pro/talk.webp",
 *     attack: "/blitz/deepseek-pro/attack.webp",
 *     win: "/blitz/deepseek-pro/win.webp",
 *     lose: "/blitz/deepseek-pro/lose.webp",
 *   }},
 */
export const BLITZ_CHARACTER_ART: Record<string, BlitzCharacterArt> = {};

/**
 * Resolve the image path for a model + pose, or null if the model has no art
 * (→ placeholder hero). Falls back to `idle` for a pose that isn't drawn yet.
 */
export function characterArt(modelId: string, pose: BlitzPose): string | null {
  const art = BLITZ_CHARACTER_ART[modelId];
  if (!art) return null;
  return art.poses[pose] ?? art.poses.idle ?? null;
}

/** True when a model has any bespoke art (so the stage can adjust framing). */
export function hasCharacterArt(modelId: string): boolean {
  return Boolean(BLITZ_CHARACTER_ART[modelId]);
}
