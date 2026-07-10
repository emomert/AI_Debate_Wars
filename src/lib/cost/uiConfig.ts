/**
 * Cost-display feature flag — pure & isomorphic, safe in server, client and
 * edge code (no React, no `server-only`).
 *
 * Master switch for the user-facing cost/token displays. HIDDEN as of July
 * 2026 (owner decision): with this `false` the arena HUD money pill, the
 * per-message cost badge, the result page's cost summary/split, the multi-
 * battle total chip and the profile spend stats are not rendered.
 *
 * Internal cost TRACKING stays fully on — per-turn cost calculation, session
 * summaries, spend caps and persistence all keep computing (the spend-cap
 * architecture depends on them). This flag only hides the presentation. Flip
 * to `true` to bring every cost display back with zero other changes. Mirrors
 * `VOICE_ENABLED` (tts/config.ts), `MULTILOCALE_ENABLED` (i18n/config.ts) and
 * `BLITZ_ENABLED` (debate/blitzConfig.ts).
 */
export const COST_UI_ENABLED = false;
