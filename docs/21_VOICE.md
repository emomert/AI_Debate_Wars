# 21 · Fighter Voices (TTS)

> Status: ✅ IMPLEMENTED (2026-06-11). Source of truth: `src/lib/tts/`,
> `src/app/api/tts/route.ts`. Cost facts render live on `/report` §8.

Voice-over for debate turns: strictly **opt-in** (🔊 toggle in the arena HUD,
off by default, persisted as `ada:voice-enabled`), with a per-message
play/stop button on completed cards. In Fast pacing the next turn waits for
the speech to finish, so a match plays like a radio broadcast.

## Two engines behind one player

| Tier | Engine | Cost | When |
|---|---|---|---|
| Free | Web Speech API (`src/lib/tts/webSpeech.ts`) | $0 | Always available; the fallback for everything |
| Premium | Kokoro-82M via DeepInfra (`src/lib/tts/server.ts` + `/api/tts`) | $0.80 / 1M chars (≈ $0.01 per full match) | When `DEEPINFRA_API_KEY` is set |

`src/lib/tts/voicePlayer.ts` (client singleton, soundManager-style) tries the
server engine when `/api/health` reports `tts: true` and falls back to Web
Speech on any failure — voice can never break a match. Fetched audio is
blob-cached per message id, so replays never re-bill.

Voice casting (`src/lib/tts/voices.ts`): Fighter A = `am_michael`, Fighter B =
`af_bella`, judge = `bm_george`; the Web Speech tier approximates the same
cast with preferred device voices + pitch/rate offsets.

## Cost armor (CLAUDE.md rules)

- `/api/tts` runs `enforceLimits(req, "tts")` (per-IP `RL_TTS_PER_MIN`,
  default 20/min) **and the daily spend caps** before any provider call, and
  `recordSpend()` after it.
- Text is sanitized server-side (`speechText.ts`: markdown/citations/URLs
  stripped) and hard-capped at 4,000 chars — a forged request can't buy more
  audio than a real turn produces.
- The real per-request cost returns in `X-Tts-Cost-Usd`; the arena HUD shows
  the running 🔊 total. The price lives in `src/lib/cost/pricing.ts`
  (`TTS_COST_USD_PER_1M_CHARS`, env-overridable), never in UI code.
- Voice cost is session-ephemeral (HUD display + server spend ledger); it is
  intentionally NOT written into the session's per-message cost breakdown, so
  stored sessions keep validating against the anti-forgery checks.

## Known limits

- Web Speech quality varies by device; chunking works around desktop Chrome's
  ~250-char utterance cutoff; iOS requires a prior user gesture.
- Kokoro has no Turkish voices — if the Turkish UI ever ships, Turkish
  matches need Web Speech or a different engine.
- Community/share replays don't call the paid route (live arena only).

## Env

- `DEEPINFRA_API_KEY` — enables the premium tier (off → free tier only)
- `TTS_PROVIDER` — `deepinfra` (default) | `none` (kill switch)
- `TTS_COST_USD_PER_1M` — price override for the HUD/ledger (default 0.8)
- `RL_TTS_PER_MIN` — per-IP rate limit (default 20)
