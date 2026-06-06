# 12 — Sound and Animation

## Goal

Sound and animation should make the product feel alive without distracting from reading.

## Sound Defaults

- Sound muted by default.
- User must manually enable sound.
- Save preference in local storage.
- No autoplay background music without interaction.

## Sound Effects

Recommended short sound effects:

1. button click
2. mode select
3. model selected
4. debate start
5. round start
6. model starts typing
7. model finishes response
8. cost counter update
9. judge enters
10. verdict reveal
11. error

## Sound Manager

Create a `soundManager.ts`.

Responsibilities:

- load sound files
- play by key
- mute/unmute
- save preference
- prevent overlapping annoying sounds
- expose `playSound("buttonClick")`

## Animation Principles

Animations should be:

- quick
- snappy
- tactile
- purposeful

Avoid:

- slow page transitions
- distracting background motion
- unreadable moving text
- too much simultaneous bouncing

## Required Animations

### Button Press

- hover lift
- active depress
- shadow changes

### Card Entrance

- small upward slide
- opacity from 0 to 1
- duration 150–250ms

### Thinking State

- pulsing dots
- active model card glow
- optional avatar bounce

### Streaming Text

- text appears token by token or sentence by sentence
- blinking cursor
- no layout jump if possible

### Round Transition

- round badge animates
- short “Round 2” reveal
- optional sound

### Verdict Reveal

- judge card pops in
- badge animation
- optional confetti
- cost summary count-up

## Reduced Motion

Respect user preference for **decorative** motion only. The live-typing
experience (JS typewriter reveal, blinking caret, thinking dots, status pulse)
is the core product and plays identically for every visitor — it is NOT gated
on the media query. Mirror `src/styles/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms;
    transition-duration: 0.01ms;
  }
  /* Exempt the live-typing companions — they are the product experience. */
  .animate-caret-blink {
    animation-duration: 1.05s;
    animation-iteration-count: infinite;
  }
  .animate-thinking-bounce {
    animation-duration: 1.2s;
    animation-iteration-count: infinite;
  }
  .animate-pulse {
    animation-duration: 2s;
    animation-iteration-count: infinite;
  }
}
```

## Animation Acceptance Criteria

Sound and animation are acceptable if:

- interface feels lively
- reading remains comfortable
- sound can be disabled
- reduced motion is respected for decorative animations (typewriter reveal,
  caret blink, thinking dots, and status pulse intentionally still play)
- no animation blocks core functionality
