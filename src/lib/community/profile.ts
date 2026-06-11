/**
 * Profile customization constants + validation (community hub identity).
 * Pure — usable from client components, server components and API routes.
 */

/** Preset arcade avatars — no uploads, no moderation burden. */
export const AVATAR_PRESETS = [
  "🥊", "🤖", "🐉", "👾",
  "🦊", "🐙", "🦅", "🧠",
  "⚡", "🔥", "🎲", "🎯",
  "🛡️", "👑", "🚀", "🎮",
] as const;

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function isValidAvatar(value: string): boolean {
  return (AVATAR_PRESETS as readonly string[]).includes(value);
}

/** Normalize raw input toward a valid handle (lowercase, trim). */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}
