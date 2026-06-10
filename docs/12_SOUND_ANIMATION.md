# 12 — Sound and Animation

> Updated 2026-06-10. Source of truth: `src/lib/audio/soundManager.ts` and
> `src/styles/globals.css`.

## Goal

Sound and animation make the product feel alive without distracting from reading.

## Sound System (as built)

**Synth-first:** all SFX are short, arcade-style chiptune blips generated with the Web Audio API — no required audio assets. Real files in `public/music/` can override any key.

- **SFX are muted by default**; the toggle persists to localStorage.
- **Background music defaults ON** (a deliberate positive default) — a generative looping synth (Dm7 → G7 → Cmaj7 → Am7, 16s loop) mastered very soft (0.03), with an optional `public/music/background.mp3` override. It pauses when the tab is hidden and resumes on visibility.
- The AudioContext is created lazily on the first user gesture, so nothing autoplays before interaction (browser policy compliant).
- **Verdict drum roll:** a looping suspense cue while the judge deliberates; `playVerdictRoll()` returns a promise so the verdict reveal is timed to the roll's end.

SFX keys: `buttonClick`, `modeSelect`, `modelSelected`, `debateStart`, `roundStart`, `typingStart`, `turnComplete`, `costTick`, `judgeEnter`, `verdictReveal`, `next`, `error`.

## Animation Principles

Quick, snappy, tactile, purposeful. Avoid slow transitions, distracting background motion, unreadable moving text, and simultaneous bouncing everywhere.

## Core Animations

- **Button press:** hover lift, active depress with shadow reduction.
- **Card entrance:** small upward slide + fade, 150–250ms.
- **Thinking state:** pulsing dots, active fighter glow, rotating playful thinking messages (large pool, slow shuffle).
- **Typewriter reveal:** text appears progressively with a blinking caret; no layout jump.
- **Round transition:** round badge reveal with optional sound.
- **Verdict reveal:** drum roll → judge card pop-in → score count-up.

## Reduced Motion

Respect `prefers-reduced-motion` for **decorative** motion only. The live-typing experience (typewriter reveal, caret blink, thinking dots, status pulse) is the core product and plays identically for every visitor — it is intentionally NOT gated on the media query. `globals.css` flattens all animations under the media query and then explicitly re-exempts `.animate-caret-blink`, `.animate-thinking-bounce`, and `.animate-pulse`.
