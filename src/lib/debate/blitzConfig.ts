/**
 * Blitz Mode feature flag — pure & isomorphic, safe in server, client and
 * edge code (no React, no `server-only`).
 *
 * Master switch for the Blitz setup option. HIDDEN for now: with this `false`
 * the setup Mode toggle is not rendered (Debate is the only mode, so a
 * single-option picker would be noise) and a persisted `mode: "blitz"` config
 * is coerced back to `debate`, so no new Blitz session can start. The whole
 * implementation (stage, runner, roster, prompts, blitz turn handling in the
 * pipeline) stays intact — flip this to `true` to bring Blitz back with zero
 * other code changes. Mirrors `VOICE_ENABLED` in `src/lib/tts/config.ts` and
 * `MULTILOCALE_ENABLED` in `src/lib/i18n/config.ts`.
 */
export const BLITZ_ENABLED = false;
