# Sound assets

SFX are synthesized with the Web Audio API by default (see
`src/lib/audio/soundManager.ts`). Real-file overrides live in **`public/music/`**
and are registered per key in the `SFX_ASSETS` map in that file — see
`public/music/README.md` for the how-to. This folder is unused and kept only so
the path is documented; prefer `public/music/` for any new audio files.

Available keys:

`buttonClick`, `modeSelect`, `modelSelected`, `debateStart`, `roundStart`,
`typingStart`, `turnComplete`, `costTick`, `judgeEnter`, `verdictReveal`,
`next`, `error`.

Sound is muted by default and a missing/broken file automatically falls back to
the synthesized effect, so nothing breaks when files are absent.
