# Sound assets (Phase 5)

Drop short, lightweight SFX files here and register them in
`src/lib/audio/soundManager.ts` (`ASSETS` map). Suggested keys:

`buttonClick`, `modeSelect`, `modelSelected`, `debateStart`, `roundStart`,
`typingStart`, `turnComplete`, `costTick`, `judgeEnter`, `verdictReveal`, `error`.

Sound is muted by default and the manager no-ops when an asset is missing, so
the app works fine with this folder empty during Phase 1.
