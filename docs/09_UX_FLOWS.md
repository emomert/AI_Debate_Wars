# 09 — UX Flows

> Updated 2026-07-08 (added Blitz Mode).

## Primary Flow

1. User lands on the home page (arcade pitch, sample topics).
2. User enters a topic — optionally runs the AI topic check to sharpen it.
3. User picks two fighters (brand → family → model; swap A/B available).
4. User sets the rules: rounds (3/5/7), tone per fighter, response length, pace (manual/auto), Deep Debate on/off.
5. User configures the judge: none, auto (preview of the pick shown), or a chosen third model.
6. Start Match → live arena.
7. The app generates one turn at a time (auto-advances or waits for clicks per pace); typewriter reveal, playful thinking messages, SFX.
8. Citations appear as chips in Deep Debate. (Cost displays are hidden as of July 2026 — `COST_UI_ENABLED` in `src/lib/cost/uiConfig.ts`; tracking still runs for the spend caps.)
9. After the final round, the judge deliberates (drum roll) and the verdict reveals.
10. Result screen: verdict, scores, summary — with **share** (auto-unfurling link + image), **save to profile** (signed-in), **change judge & re-judge**, and rematch options.

## Blitz Mode

> **Currently HIDDEN** behind `BLITZ_ENABLED = false` in
> `src/lib/debate/blitzConfig.ts`: the setup mode toggle is not rendered and a
> persisted blitz config is coerced back to Debate. The implementation below
> stays intact — flip the flag to bring it back.

Setup has a **mode toggle** (Debate / Blitz). Blitz is a fast, spectacle-first
variant designed for share clips:

- **Fixed format:** 4 rounds / 8 turns (Opening Shot · Cross-Fire · Counter-Fire ·
  Final Blow), `punchy` length (1–2 sentences), **auto pace only**. The rounds/
  tone/length/pace/deep/multi-battle controls are hidden — Blitz forces them.
- **Curated roster:** the fighter picker is restricted to `blitzRoster.ts`
  (~12 models). Non-roster models stay available in Debate mode only.
- **The stage:** instead of transcript cards, Blitz renders `BlitzStage` — two
  fighter panels, a round-title card, a bottom dialogue box (one line at a time),
  and full-frame **move splashes** (OBJECTION / COUNTER / RECEIPTS / TOUCHE /
  FINISHER) parsed from each turn's leading tag server-side.
- **Speed:** `useBlitzRunner` buffers the first `BLITZ_BUFFER` (4) turns behind a
  VS intro, then streams playback while the rest generate — no mid-show stall.
- **Verdict:** the same judge decides, but it's revealed **in-scene** (winner
  banner + CTAs: Rematch / Full result / transcript), not on the results card.
- **Accessibility:** an always-on screen-reader transcript announces each line;
  reduce-motion collapses the stage to instant captioned text (no splash/shake).
- **Phase 1** ships on the reusable fighter *panel*; bespoke per-model character
  sprites + hero MP3 stings are Phase 2. Spec:
  `docs/superpowers/specs/2026-07-08-blitz-mode-design.md`.

## Multi-Battle Matches

A match can pit **1–3 battles** against the same topic at once — each battle is its own fighter pairing; everything else (topic, rounds, tone, length, Deep Debate, judge, pace, voice) is shared.

- **Setup:** the fighters section is a battle list — battle #1 is the usual A-vs-B picker; "➕ Add another battle" adds a second/third (each with its own swap + remove). The match card lists every pairing.
- **Arena:** all battles run **concurrently**. A tab bar (shown only when 2+ battles) switches the view; each tab shows the pairing, a live status dot, the round counter and the winner once judged. Switching finishes the current turn first so nothing is cut off, and only the **watched** battle makes sound or speaks — background battles run silent and never fetch voice.
- **Pace:** in manual pace only the watched battle waits for "Next Turn"; background battles keep auto-advancing. Auto plays everything. "Stop" stops the whole match; "See Results" enables once **every** battle is finished.
- **Results / sharing:** the results screen has the same battle switcher; verdict, re-judge, share link, community publish and save-to-history all operate on the **selected** battle (one link / post / history row each).

## Page Notes

- **Home:** hero, sample topics, "Use Debator" / "Try Sample" CTAs, About/Report/Profile links, sound toggle.
- **Setup:** game-match configuration feel ("Choose your fighters", "Set the rules"); the judge is mandatory — users pick only Auto Judge vs a hand-picked third model; validation gates the start button; localized error copy.
- **Arena:** top HUD (topic, round counter, total cost, sound, stop); fighter cards with idle/thinking/speaking states; full-width message timeline; sticky controls on mobile.
- **Result:** ONE merged verdict card (July 2026) — a compact question strip with Pro (blue) / Against (red) chips + brand logos, winner + reasoning + tug-of-war score, then a footer with the judge + an inline "Change the judge" expander and the share row: colorful app-style brand tiles for X / Instagram / Reddit (Instagram copies a caption and opens the site — it has no web share intent; X/Reddit carry the stateless /s verdict-preview URL), Copy image, and "Share match" — one click publishes an UNLISTED community copy (full transcript + verdict at /m/&lt;id&gt;, link-only, same post updated on re-click) and copies that short link; signed-out or rejected publishes fall back to copying the whole match as CRLF plain text. The old separate Share/Match-Summary panels and the Copy-link button are gone.
- **Share page (`/s`):** public, stateless; renders the verdict from the URL payload with OG tags for unfurl.
- **Profile:** match history (topic, fighters, winner, cost, date — click to reopen) + headline stats; delete one match or all.
- **Login:** magic link + Google; framed as a perk ("save your matches"), never a gate.

## Error UX

Friendly, playful errors with real guidance:

- Missing key → "The arena has no power source."
- Provider timeout → "The fighter froze mid-round. Try again or switch models."
- Rate limited / spend cap → "The arena is cooling down. Wait a moment before the next match."

Transient provider errors retry automatically before surfacing.

## Empty States

- No topic → "Drop a topic into the arena first."
- No fighters → "Choose two fighters before starting."
- Judge disabled → "No judge selected. The debate will end after the final round."
- Empty profile → prompt to play a first match.

## Mobile

Stacked setup cards, sticky start button, compact HUD, horizontal fighter cards, full-width messages, collapsible cost details, mobile-sized example chips.

## Accessibility

Keyboard-accessible controls, visible focus rings, strong contrast, sound optional. Reduced motion flattens **decorative** animations only — the typewriter reveal, caret blink, thinking dots, and status pulse are the core product experience and play for everyone by design.
