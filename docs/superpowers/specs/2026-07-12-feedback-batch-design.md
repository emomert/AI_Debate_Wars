# 2026-07-12 Owner feedback batch — design

Owner-approved batch (interactive Q&A, all recommendations accepted). Thirteen
items across catalog, rules, demo, audio, analytics, auth, mobile UX, and token
budgets. Each section states the change and the verified root cause it rests on.

## 1. Featured OpenAI model: GPT-5.4 Mini

`RECOMMENDED_MODEL_IDS` (modelRegistry.ts:163) swaps `gpt-4o-mini` →
`gpt-5.4-mini`, so the OpenAI shortlist before "Show all" is 5.6 Sol / 5.6 Luna
/ 5.4 Mini. `defaultFighters()` (ArenaContext.tsx:97) also moves to
`gpt-5.4-mini` so the default pick is a featured model. GPT-4o Mini stays in
the catalog and the auto-judge pool (`PREFERRED_JUDGE_IDS`).

## 2. Strictly 3 rounds

- Remove the Rounds block from setup (`setup/page.tsx:346-360`) + the
  `RoundSelector` component; trim `ROUND_OPTIONS`.
- Clamp any persisted config to `roundCount: 3` in setup normalization (same
  pattern as the Blitz→Debate coercion at setup/page.tsx:130-134) and in
  `startMatch`.
- Copy: home step "3 / 5 / 7 rounds" → 3 rounds (en+tr); setup keeps the
  `rounds[3]` label ("Quick Match") for the summary card.
- Back-compat is intentional: `RoundCount = 3|5|7` type, `VALID_ROUNDS`,
  `DEBATE_5/7` round plans, and every dynamic `session.roundCount` display site
  stay — published/shared/persisted 5/7 matches keep loading and rendering.
- /report playground rounds knob: pinned to 3 (report renders from real source
  files; keep it truthful).

## 3. Token ceiling (reasoning models)

Root cause: OpenRouter turns send `max_tokens = visible + 1300` when
`reasoningEffort` is set (openRouterProvider.ts:34-38); low-effort thinking
floors around ~1024+ tokens, so short (380) turns starve → empty completion →
`TOKEN_LIMIT_EXCEEDED` (422, non-retried) or silent mid-sentence truncation.

- Raise the reasoning headroom `+1300` → `+2500` (parity with DeepSeek's
  headroom), still clamped by per-model `maxOutputTokens` 8192. Judge path
  inherits the same bump.
- Auto-retry once at the full per-model ceiling: the turn route catches
  `TOKEN_LIMIT_EXCEEDED` and reissues the provider call once with
  `maxOutputTokens = model.maxOutputTokens` (8192) before erroring. Verdict
  route gets the same retry.
- Spend caps/costs unaffected by design: billing uses actual usage
  (calculateCost.ts:39), `recordSpend` runs after real calls, and the client
  CostEstimator reads length presets, not ceilings.

## 4. Analytics

**Admin total cost = 0.** `buildMatchCard` copied the client's
`session.costSummary.totalCost`, which is still the zeroed initial summary at
verdict-POST time (the client recomputes it only after the verdict returns).
Fix: derive `match_cost` server-side in `matchCard.ts` from the per-message
costs it already reads (`splitCosts`) + the server-computed judge cost, and
ignore the client summary.

**Profile "Completed: 0".** There is no auto-save: the only `matches` insert is
the manual "Save to my history" button (MatchSaver). Fix: auto-save on
completion for signed-in users — when a run reaches `persist("complete")` (and
on re-judge updates), upsert via the existing `toMatchRow` path; MatchSaver
becomes a "Saved ✓" state (still handles the signed-out → login → save flow).
Save failures surface in UI instead of console-only.

## 5. Consent gate on all auth paths

Magic Link + Google + GitHub buttons stay disabled until the 13+/terms
checkbox is ticked, in BOTH sign-in and create-account modes (any of them can
create an account on first use). The affirmation is remembered per device
(localStorage `debator:consent-v{TERMS_VERSION}`) and pre-ticks the box so
returning users aren't nagged. Email+password signup keeps its existing
required checkbox; consent metadata recording (age_confirmed,
terms_accepted_at, terms_version) is unchanged.

## 6. "See a Demo" (~30s in-app animated replay)

Replaces "Try a Sample" on the home hero. `DemoOverlay` full-screen client
component + `demoScript` timeline, playing lightweight replicas of the setup
and arena screens with a baked fixture of one REAL match (DeepSeek V4 Flash
PRO vs GPT-5.4 Mini AGAINST, topic "Jamie Lannister is a good person.",
serious/short/3 rounds/auto judge — captured once via the live API routes into
`src/lib/demo/fixture.json`).

Storyboard (≤30s): topic types out with zoom (0-7s) → fighter tiles select
(7-14s) → rules highlight serious/short/auto-judge, START pressed (14-17s) →
sped-up streaming turns across rounds 1-3 with splashes (17-27s) → verdict
card + "Your turn" end card with Use Debator CTA (27-30s). Skippable (✕/Skip),
reduce-motion → instant-cut variant (no zooms/typing), SFX only when arcade
sound is already on. The old sample-config path (`sampleConfig`/`samplePool`/
`trySample`) is deleted; i18n home keys rewritten (en+tr).

## 7. Audio: silence everything when the tab is hidden

Music already stops via the `visibilitychange` handler; SFX entry points never
check visibility (and file-based SFX live outside the AudioContext, so
suspending the context wouldn't cover them). Fix centrally in soundManager:
early-return on `document.hidden` in `play()`, `keystroke()`, and
`playVerdictRoll()`.

## 8. Mobile / HUD polish

- Stop-bar: arena column gets a min-height flex chain so the sticky
  `DebateControls` bar actually reaches the viewport bottom; container padding
  `py-3`→`py-2` and the Stop button drops to `size="sm"`.
- Tone chip: i18n `tone()` returns the bare value (en "Tone: X" / tr
  "Üslup: X" prefixes dropped).
- Pace toggle: fixed `min-w` + `whitespace-nowrap` so
  "Switch to ⚡ Fast" ↔ "Switch to 🚶 Normal" can't resize or wrap the chip.
- Picker density (mobile only): provider grid `gap-1.5`, tile `py-2`; model
  rows `p-2.5 gap-2`, with `sm:` restoring current desktop sizes.
- Response length default: verified already `short`; the owner's sighting was
  same-tab sessionStorage persistence. No change (owner-approved).

## Out of scope

Retiring gpt-4o-mini from the judge pool; surfacing partial-truncation
(non-empty `finish_reason:"length"`) as a retryable condition; report page
demo-card label. Flagged, not requested.
