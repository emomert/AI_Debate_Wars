/**
 * Voice (Fighter Voices / TTS) feature flag — pure & isomorphic, safe in
 * server, client and edge code (no React, no `server-only`).
 *
 * Master switch for the opt-in 🔊 voice-over (docs/21). HIDDEN for now: with
 * this `false` the setup voice card, the arena HUD voice toggle + cost badge,
 * and the per-message play/stop buttons are not rendered; the client
 * `voicePlayer` engine no-ops (no Web Speech either); and the server is treated
 * as having no TTS provider, so `/api/tts` 503s and no paid speech can ever
 * fire. The whole implementation stays intact — flip this to `true` to bring
 * fighter voices back with zero other code changes. Mirrors
 * `MULTILOCALE_ENABLED` in `src/lib/i18n/config.ts`.
 *
 * NOTE: this is unrelated to the arcade SFX and background-music toggles, which
 * live in `src/lib/audio/soundManager.ts` and stay on.
 */
export const VOICE_ENABLED = false;
