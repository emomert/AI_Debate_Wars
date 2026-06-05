# 17 — Acceptance Criteria

## MVP Acceptance Criteria

The MVP is acceptable when all of these are true.

## Product

- [ ] User can enter a topic.
- [ ] User can select Debate Mode.
- [ ] User can select Discussion Mode.
- [ ] User can select Model A and Model B.
- [ ] User can select 3, 5, or 7 rounds.
- [ ] User can select tone.
- [ ] User can enable or disable Judge Mode.
- [ ] User can select judge model option.
- [ ] User can start a match.
- [ ] User can stop a match.

## Debate Engine

- [ ] Debate Mode assigns opposing sides.
- [ ] Discussion Mode assigns complementary roles.
- [ ] Round plan is deterministic.
- [ ] Speaker order is deterministic.
- [ ] Debate ends after selected round count.
- [ ] Judge appears only after all rounds complete.
- [ ] No infinite loop is possible by default.
- [ ] Mock provider can complete a full debate.

## UI

- [ ] UI uses dotted grid background.
- [ ] UI uses thick black borders.
- [ ] UI uses chunky shadows.
- [ ] UI uses bright arcade colors.
- [ ] Buttons have tactile press animation.
- [ ] Model cards feel like game characters.
- [ ] Debate page shows round progress.
- [ ] Message cards show speaker and role.
- [ ] Cost badges appear under messages.
- [ ] Total cost appears in HUD.
- [ ] Verdict card appears at end if judge enabled.
- [ ] Mobile layout is usable.

## Providers

- [ ] Provider interface exists.
- [ ] Mock provider exists.
- [ ] OpenAI provider exists.
- [ ] DeepSeek provider exists.
- [ ] API keys are server-side only.
- [ ] Provider errors are normalized.

## Cost

- [ ] Pricing file exists.
- [ ] Cost calculation function exists.
- [ ] Per-message cost is shown.
- [ ] Total cost is shown.
- [ ] Unknown usage fallback is handled.

## Prompting

- [ ] Debate Mode prompts enforce assigned stance.
- [ ] Discussion Mode prompts enforce assigned role.
- [ ] Prompts instruct model to answer one turn only.
- [ ] Prompts discourage repetition.
- [ ] Judge prompt does not continue debate.

## Security

- [ ] API keys are not exposed in frontend.
- [ ] Inputs are validated.
- [ ] Max rounds are enforced.
- [ ] Max output tokens are enforced.
- [ ] Basic private beta protection exists or is planned.

## Overall

- [ ] The product feels like an arcade game.
- [ ] The output remains useful and structured.
- [ ] The architecture can support OpenRouter later.
