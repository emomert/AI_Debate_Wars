# 21 · Fighter Voices (TTS)

> Status: ✅ IMPLEMENTED (2026-06-11), 🙈 HIDDEN for launch (2026-06-15).
> The feature is complete but gated off behind `VOICE_ENABLED = false` in
> `src/lib/tts/config.ts` (mirrors `MULTILOCALE_ENABLED`): the setup voice card,
> the arena HUD voice toggle + cost badge, and the per-message play/stop buttons
> are not rendered; `voicePlayer` no-ops (no Web Speech either); and
> `isServerTtsConfigured()` returns `false` so `/api/tts` 503s and no paid speech
> can fire. This is unrelated to the arcade SFX/music toggles, which stay on.
> Flip `VOICE_ENABLED` to `true` to restore everything below. Source of truth:
> `src/lib/tts/`, `src/app/api/tts/route.ts`. Cost facts render live on
> `/report` §8 (also gated by the flag).

Voice-over for debate turns: strictly **opt-in** (🔊 toggle in the arena HUD,
off by default, persisted as `ada:voice-enabled`), with a per-message
play/stop button on completed cards. In Fast pacing the next turn waits for
the speech to finish, so a match plays like a radio broadcast.

## Two tiers behind one player

| Tier | Engine | Cost | When |
|---|---|---|---|
| Free | Web Speech API (`src/lib/tts/webSpeech.ts`) | $0 | Always available; the fallback for everything |
| Premium | OpenAI speech, `gpt-4o-mini-tts` (`src/lib/tts/server.ts` + `/api/tts`) | ≈ $15 / 1M-char equivalent (≈ 13¢ per fully voiced match) | Whenever `OPENAI_API_KEY` is set — zero extra vendor setup |

`src/lib/tts/voicePlayer.ts` (client singleton, soundManager-style) tries the
server engine when `/api/health` reports `tts: true` and falls back to Web
Speech on any failure — voice can never break a match. Fetched audio is
blob-cached per message id, so replays never re-bill.

**Sync.** The runner calls `voicePlayer.prepare()` while the turn is still in
the "thinking" state — that fetches the audio (covered by the thinking bubble)
and reads its duration. Playback then starts the instant the typewriter does,
and the text reveal is paced to the speech length
(`typewriter(content, durationMs)`), so words appear roughly as they're
spoken instead of after the whole turn has typed out. The next turn waits for
the voice to finish, keeping Fast pacing polite.

Voice casting (`src/lib/tts/voices.ts`): Fighter A = `onyx` (deep male),
Fighter B = `nova` (warm female), judge = `fable` (British male). The Web
Speech tier approximates the same cast with preferred device voices +
pitch/rate offsets.

**Tone-styled delivery**: the match tone rides along on every `/api/tts`
request and maps to a `gpt-4o-mini-tts` `instructions` string
(`VOICE_STYLE_BY_TONE`) — serious sounds composed, aggressive jabs,
casual banters, the hidden unhinged tone seethes, and custom tone text is
passed through (sanitized, 80-char cap). The judge always gets courtroom
gravitas. Legacy `tts-1` models reject `instructions`, so it's omitted there.

## Cost armor (CLAUDE.md rules)

- `/api/tts` runs `enforceLimits(req, "tts")` (per-IP `RL_TTS_PER_MIN`,
  default 20/min) **and the daily spend caps** before any provider call, and
  `recordSpend()` after it.
- Text is sanitized server-side (`speechText.ts`: markdown/citations/URLs
  stripped) and hard-capped at 4,000 chars — a forged request can't buy more
  audio than a real turn produces.
- The real per-request cost returns in `X-Tts-Cost-Usd`; the arena HUD shows
  the running 🔊 total. The price lives in `src/lib/cost/pricing.ts`
  (`TTS_COST_USD_PER_1M_CHARS`, `TTS_COST_USD_PER_1M` env override), never
  in UI code. (OpenAI bills per audio token ≈ $0.015/min; the per-character
  figure is its ledger equivalent.)
- Voice cost is session-ephemeral (HUD display + server spend ledger); it is
  intentionally NOT written into the session's per-message cost breakdown, so
  stored sessions keep validating against the anti-forgery checks.

## Known limits

- Web Speech quality varies by device; chunking works around desktop Chrome's
  ~250-char utterance cutoff; iOS requires a prior user gesture.
- Community/share replays don't call the paid route (live arena only).
- If voice volume ever matters at scale, a cheaper open-weight engine
  (e.g. Kokoro-82M at ~$0.80/1M chars on commodity hosts) can slot in behind
  the same `synthesizeSpeech()` seam — it was prototyped and removed in
  favor of the zero-setup OpenAI path (git history: 430a5b8 and parent).

## Env

- `TTS_PROVIDER` — `none` disables; otherwise on whenever `OPENAI_API_KEY`
  is set
- `TTS_OPENAI_MODEL` — OpenAI speech model (default `gpt-4o-mini-tts`)
- `TTS_SPEED` — voice playback rate, 0.25–4.0 (default 1.3; the typewriter
  paces to the resulting audio length, so this also speeds the text reveal)

A **Skip** control (HUD, shown while a turn is typing) instantly reveals the
full answer and stops the voice via `runner.skipTurn()` + `voicePlayer.stop()`.
Turning the HUD voice toggle back ON while a turn is on screen replays it, so
"open voice again" continues out loud.
- `TTS_COST_USD_PER_1M` — price override for the HUD/ledger (default 15)
- `RL_TTS_PER_MIN` — per-IP rate limit (default 20)
