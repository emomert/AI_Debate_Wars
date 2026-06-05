# Phase 2 — Mock Debate Engine Prompt

```text
Implement Phase 2 only: deterministic mock debate engine.

Read:
- docs/04_DEBATE_ENGINE.md
- docs/05_PROMPTING.md
- docs/10_DATA_MODEL.md
- docs/14_TEST_PLAN.md

Requirements:
- Create debate types.
- Create round plans for Debate Mode and Discussion Mode.
- Support 3, 5, and 7 rounds.
- Create orchestrator functions.
- Create mock provider.
- Generate one turn at a time.
- Track message status.
- Track mock usage and mock cost.
- Generate mock judge verdict if enabled.
- Ensure the debate ends after the selected round plan.
- No infinite loops.

Do not:
- add real OpenAI or DeepSeek calls yet
- let the model decide next speaker
- hardcode logic into UI components

After implementation, list files changed and how to test 3/5/7 round flows.
```
