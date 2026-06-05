# Phase 4 — Streaming and Cost Prompt

```text
Implement Phase 4 only: streaming responses and cost tracking.

Read:
- docs/06_API_CONTRACTS.md
- docs/08_COST_TRACKING.md
- docs/12_SOUND_ANIMATION.md

Requirements:
- Add real or simulated streaming from API routes.
- Show streaming text in DebateMessageCard.
- Add pricing config file.
- Add cost calculation utility.
- Track input tokens, output tokens, total tokens, latency, and estimated cost.
- Show per-message cost badge.
- Show total debate cost in HUD.
- Handle missing usage data with an estimated fallback.
- Keep UI playful and readable.

Do not:
- hardcode pricing in components
- block the UI while generation is running
- break mock mode

After implementation, explain cost calculation and streaming behavior.
```
