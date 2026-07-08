# Blitz Mode — Design Spec

> Status: **Approved design, pre-implementation.** Authored 2026-07-08.
> Product: Debator (AI Debate Arena). Owner-approved through collaborative brainstorming.
> Next step: an implementation plan (superpowers:writing-plans), built in the phases below.

## 1. Overview

Blitz is a new debate **mode** — a fast, loud, spectacle-first variant that sits beside the
existing Debate mode. A curated roster of ~12 "hero" fighters trade rapid one-to-two-sentence
blows on a persistent animated **stage** (an original, arcade-styled take on the "courtroom
objection" meme). Each turn slams in with an OBJECTION-style splash and a sound sting. The
existing neutral judge still decides the winner — but in Blitz the verdict is revealed
**in-scene** (gavel bang → winner splash), not on the static results card.

Design feeling: the project's north star — *"arcade interface, serious intelligence"* — turned
up to eleven. Built for short, shareable clips.

The core product principle is preserved: **the app controls the flow.** Models generate only
individual, bounded turn responses; they never decide who speaks next, when the match ends, or
whether/how they win. The one new signal a model emits — a leading "move tag" — only *labels*
its own rhetorical stance and is validated against a fixed enum server-side; it never affects
flow.

## 2. Goals & non-goals

**Goals**

- A distinct, high-energy mode that feels like a fast-paced live debate, not a calm turn reveal.
- Speed is the #1 priority: no perceptible stalls during the show.
- Reuse the existing debate pipeline (providers, cost, rate limits, moderation, judge, share).
- An art/asset system that scales without code changes and never blocks launch.

**Non-goals (explicitly out of v1)**

- Momentum / health meter or any per-turn LLM scoring (owner chose "judge decides, as usual").
- Token streaming from providers (that is the tracked P2-3 item; overkill for 1–2 sentence turns).
- Multi-battle Blitz — Blitz is strictly 1v1.
- Bespoke art for all 56 catalog models — Blitz uses a curated roster instead.

## 3. Locked decisions (from brainstorming)

| Decision               | Choice                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interjection model     | **Every turn is a move** — model prepends a move tag; app strips it and fires the matching splash + sting. Deterministic, zero extra API cost.                                               |
| Win condition          | **The existing judge decides**, exactly as today. Only the *reveal* changes (in-scene).                                                                                                      |
| Screen during play     | **Persistent animated "stage"** (meme environment): two fighter panels, a bottom dialogue box showing the current line only, full-frame splashes, in-scene verdict.                          |
| Fighter representation | **Bespoke character per model**, delivered as a **curated Blitz-only roster** (~12 models). Non-roster models are simply not selectable in Blitz; they stay available in normal Debate mode. |
| Audio                  | **Hybrid** — procedural synth for frequent small cues (whoosh, hit, momentum tick) + ~2 preloaded hero MP3s (an "OBJECTION!" shout, a KO stinger).                                           |
| Match length           | **4 rounds / 8 turns** — labels: Opening Shot · Cross-Fire · Counter-Fire · Final Blow.                                                                                                      |
| Pacing                 | **Auto only** (manual gating would kill momentum). Reduce-motion still collapses to instant reveals.                                                                                         |
| Pre-generation         | **Buffer 4 turns, then stream the rest** during playback (video-buffering model). Buffer size is a single tunable constant.                                                                  |
| Playback engine        | A **separate `useBlitzRunner`** (not an extension of `useDebateRunner`).                                                                                                                     |
| Rollout                | **Phase 1 ships on the reusable panel**; bespoke art layers in as Phase 2.                                                                                                                   |

## 4. Match structure & UX flow

- New `mode: "blitz"` beside `debate` / `discussion`.
- New response length **`punchy`**: ~90 max output tokens, ≤ ~40 words, 1–2 sentences.
- **8 turns = 4 mini-rounds** (Model A then Model B each round). Round labels:
  1. **Opening Shot** — state your side, hard and fast.
  2. **Cross-Fire** — attack the opponent's opening.
  3. **Counter-Fire** — defend and hit back.
  4. **Final Blow** — one-line closer.
- Then the judge verdict (auto or user-picked model), revealed in-scene.
- **Auto pace only.** No "your move" gate. Reduce-motion path reveals every line instantly.
- Everything else (topic entry + AI topic check, judge selection, cost tracking, share links,
  moderation) reuses the current pipeline unchanged.

**Screen flow:** `VS intro (buffer fills) → Round title card → A speaks → B speaks → …×4 →
verdict reveal → results CTAs`.

## 5. The "every turn is a move" mechanic

The Blitz prompt instructs each fighter to **begin its turn with exactly one move tag** from a
fixed enum, on its own line, e.g. `OBJECTION:` followed by the punchy line.

Server-side, a new `parseMove(raw)` utility:

1. Reads the leading tag (case-insensitive, tolerant of `OBJECTION!`, `OBJECTION:`, etc.).
2. Validates it against the enum. Unknown or missing → `move = null` (no splash; never errors).
3. **Strips** the tag from the content so the client only ever receives clean display text plus
   a `move` field on the message.

Move enum (original / trademark-safe — "objection" is generic courtroom language; deliberately
avoids Ace Attorney's specific "HOLD IT" / "TAKE THAT" wording):

| Tag         | Fires when                         | Splash treatment        |
| ----------- | ---------------------------------- | ----------------------- |
| `OBJECTION` | rebutting / attacking a claim      | red full-frame slam     |
| `COUNTER`   | flipping the opponent's point back | blue slam               |
| `RECEIPTS`  | citing a fact / concrete example   | yellow "evidence" card  |
| `TOUCHE`    | (rare) conceding a point           | small gray, light shake |
| `FINISHER`  | final-round closer                 | big KO-style splash     |

Move names are display-tunable; the enum is the contract. The prompt biases tag choice by round
(e.g. Final Blow favors `FINISHER`) but the model picks; the app tolerates any valid tag.

## 6. Generation & speed architecture

Turns are **deterministic and sequential** — turn *n*'s prompt contains turns `1..n-1`, so they
must be generated in order. The runner pre-generates ahead of playback like a video buffer:

- **Buffer:** before the show plays, generate the first `BLITZ_BUFFER = 4` turns (sequential
  calls to the existing `/api/debate/turn` route). The **VS intro** animation masks this
  ~8–16s fill.
- **Stream:** start playback once the buffer is full; keep generating the remaining turns in the
  background while earlier ones play. Playback of the first 4 turns (~12–16s) outruns generation
  of turns 5–8 (~8–16s), so playback never catches the generator. If it ever does (a slow
  provider), the stage holds on a brief "thinking" beat rather than showing an error, reusing the
  runner's existing silent-retry resilience.
- **First-turn latency** is unavoidable (nothing to prefetch); the VS intro exists precisely to
  cover it. `BLITZ_BUFFER` is a single constant, tuned after observing real latency.

Rejected alternatives: rolling prefetch-of-one (thinner safety margin than the owner wanted);
generate-all-8-then-play (~15–30s dead load up front); token streaming (P2-3, unnecessary for
punchy turns); a new server-side "run the whole match" route (replicates rate-limit / spend /
moderation, long single request vs `maxDuration`, larger blast radius).

Reuses per-turn: cost calc, `recordSpend`, per-IP rate limit, and — critically — the topic
moderation gate that now runs on **every** turn (see the 2026-07-08 moderation fix), so Blitz
inherits topic safety for free.

## 7. The stage (view)

When `mode === "blitz"`, the debate page renders `BlitzStage` instead of the card arena.
Isolated components, each with a single responsibility:

- **`BlitzStage`** — orchestrates layout + the playback clock; consumes `useBlitzRunner`.
- **`FighterPanel` ×2** — character sprite + nameplate + brand-color frame. Pose state:
  `idle | attack | hit | win | lose`.
- **`DialogueBox`** — bottom bar; types out the *current* line only (fast typewriter) with the
  speaker's nameplate + move label.
- **`MoveSplash`** — full-frame overlay per move; enters with slam + screen shake + sting, exits
  after ~300–500ms.
- **`VsIntro`** — entrance animation; masks the buffer fill.
- **`VerdictReveal`** — in-scene gavel → winner splash → CTAs (Rematch / Share / See transcript).
- **`BlitzTranscript`** — hidden by default; the screen-reader surface **and** the reduce-motion
  / replay reader (full history as accessible text).
- **`useBlitzRunner`** — Blitz playback engine: buffer-then-stream generation, the stage state
  machine, and move-splash sequencing. Reuses `generateTurn` / `generateVerdict` clients, cost
  calc, and session persistence. Kept **separate** from `useDebateRunner` because the playback
  model differs enough that merging would tangle both.

**Match state machine:** `intro → (roundTitle → A → B) ×4 → verdict → done`.
**Per-turn sub-states:** `waiting → speaking → moveSplash → settle`.

## 8. Animation / game-feel ("feels like a fast debate")

- Idle bob; lean-in on speak.
- Opponent **recoil + flash** when a move lands.
- **Screen shake scaled to move weight** (`TOUCHE` tiny → `FINISHER` big).
- Speed-line / impact-frame background flash on `OBJECTION`.
- Fast per-character dialogue blips (a much faster typewriter than Debate mode's reveal).
- Subtle camera push-in on the speaker; snap-to-center on a splash.
- Tight ~300ms beat between turns (vs Debate mode's 850ms "thinking" beat).

**All motion is gated behind reduce-motion** (OS `prefers-reduced-motion` OR the in-app toggle):
no shake, no infinite bob, instant text — the stage collapses to a clean captioned exchange.
This is both a hard project rule and the accessible path. Sipping/looping animation must never
run when reduced motion is set.

## 9. Character sprite system & contract

Each roster model ships a **fixed 5-pose set** — `idle, attack, hit, win, lose` — as a
transparent WebP atlas on a fixed canvas (target 512×512 per frame, consistent anchor/baseline so
poses swap without jitter). Trademark guidance: characters are **Debator's own original fighters,
loosely themed** to each model — never the providers' logos-as-faces or their brand mascots.

- `blitzRoster.ts` registry: `modelId → { characterKey, available }`. **Only listed models
  appear in the Blitz picker.**
- **Preload only the two fighters in the current match** + the shared splash art. Roster size can
  grow freely without hurting load time.
- Fallback: if a roster entry's art is missing, `FighterPanel` renders the reusable panel (the
  Phase-1 design) so a half-finished character never breaks the build.
- A separate **art spec** (canvas size, anchor, pose list, file naming, palette guidance) is an
  owner deliverable so characters can be produced to a template (by hand or an AI pipeline) and
  dropped in with no code change.

**Proposed initial roster (~12, owner finalizes)** — chosen for provider spread from the current
catalog: DeepSeek V4 Pro, DeepSeek V4 Flash, a flagship OpenAI model, a mini OpenAI model, Qwen3
Next 80B, Qwen3 Coder, Llama 3.3 70B, plus ~5 marquee OpenRouter names of the owner's choice.

## 10. Audio plan (hybrid)

- **Procedural synth** (extend `soundManager`, new `SoundKey`s): whoosh, hit tick, momentum tick,
  round-title stab, verdict gavel. Zero asset weight, instant, on-brand with existing SFX.
- **~2 preloaded hero MP3s** (using the manager's existing per-key file-override support): an
  "OBJECTION!" shout and a KO stinger, preloaded so they never stall the first hit.
- Honors the existing sound toggle. Background music stays off by default (unchanged).
- A spoken "OBJECTION!" via TTS is deferred until `VOICE_ENABLED` flips on (Phase 3).

## 11. Backend & data-model changes (small; reuses the pipeline)

- **`debateTypes.ts`**: add `"blitz"` to `DebateMode`; add `"punchy"` to `ResponseLength`; add a
  `BlitzMove` enum type; add `move?: BlitzMove` to `DebateMessage`.
- **`promptBuilder.ts`**: add the `punchy` length preset (~90 tokens, ≤40 words); add a Blitz
  system-prompt addendum (leading move tag from the enum, stay-in-character, punchy style, no
  lists). Note: `punchy` is **blitz-internal** — it must NOT appear in Debate mode's
  short/medium/long length selector. Adding it to the shared `ResponseLength` type will surface
  every exhaustive `Record<ResponseLength, …>` site via the compiler; the Debate-mode length UI
  filters it out explicitly.
- **`roundPlans.ts`**: add a `BLITZ_4` plan (4 rounds, punchy tasks) for both `en` and `tr`
  (parity with the existing pattern; TR stays hidden behind `MULTILOCALE_ENABLED`).
- **`parseMove()`** (new util, server-side): extract + validate + strip the leading tag; returns
  `{ move, content }`. Applied in `/api/debate/turn` before the message is returned.
- **`validators.ts`**: accept `blitz` mode + `punchy` length; Blitz turn-count guard (8 turns);
  enforce auto pace for blitz. Moderation already runs every turn (2026-07-08 fix) → inherited.
- **Rate limit**: a Blitz match fires 8 turn calls in a burst. The code default
  `RL_TURN_PER_MIN = 60` accommodates it, but `.env.example` still shows `8` — align it so a
  single Blitz match can't self-throttle.
- **Setup UI**: a Blitz mode card; the fighter picker filtered to `blitzRoster`; pace + length
  forced (auto / punchy) so there is no conflicting config to surface.
- **Share / OG**: works unchanged (verdict-based). A Blitz-flavored OG image is Phase 3.

## 12. Phasing / build order

- **Phase 1 — playable engine (no bespoke art):** blitz mode + punchy length + `BLITZ_4` plan +
  `parseMove` + `useBlitzRunner` (buffer-4) + `BlitzStage` rendered with the **reusable panel** +
  synth SFX + in-scene verdict + reduce-motion/accessible transcript. Result: a fully playable
  Blitz on panels — proves the engine before any art exists.
- **Phase 2 — the look:** bespoke sprite system + the ~12 roster characters + the 2 hero MP3
  stings + the full juice pass.
- **Phase 3 — later/optional:** Blitz-flavored OG image; Turkish strings (when multilocale flips
  on); spoken "OBJECTION!" (when VOICE flips on).

## 13. Owner deliverables (non-code)

- Finalize the ~12-model roster.
- Produce character art to the sprite spec (Phase 2).
- Source/produce the 2 hero MP3 stings (Phase 2) — fold into the existing open audio-license task.

## 14. Testing considerations

- `parseMove` unit tests: each valid tag, unknown tag → null, missing tag → null, punctuation
  variants, tag-stripping correctness.
- Buffer/stream: playback never outruns generation at expected latency; a mid-stream generation
  failure holds on "thinking" and recovers (silent retry), never a hard error mid-show.
- Reduce-motion: stage collapses to instant captioned text; no looping/shake animation runs.
- Rate limit: an 8-turn burst stays under `RL_TURN_PER_MIN`.
- Fallback: a roster model with missing art renders the panel, not a broken sprite.
- Verify per project workflow: `npx tsc --noEmit` + `next build` before declaring done.
