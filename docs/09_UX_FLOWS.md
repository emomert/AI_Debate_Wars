# 09 — UX Flows

## Primary Flow

1. User lands on Home Page.
2. User sees playful explanation and topic input.
3. User enters topic.
4. User selects Debate or Discussion Mode.
5. User selects Model A and Model B.
6. User selects round count.
7. User selects tone.
8. User configures Judge Mode.
9. User clicks Start Match.
10. Debate screen opens.
11. App generates one turn at a time.
12. User watches streamed responses.
13. Costs update after each response.
14. Debate completes.
15. Judge verdict appears if enabled.
16. User can restart, change setup, or share result later.

## Home Page UX

Primary goal:

- explain the product quickly
- get the user to start a match

Main elements:

- logo/title
- short tagline
- topic input
- mode preview
- start button
- sample topics
- sound/help icons

Suggested hero copy:

```text
Make AIs Fight Your Ideas
Pick a topic, choose two models, set the rules, and watch the debate unfold.
```

CTA:

```text
START MATCH
```

Secondary CTA:

```text
TRY SAMPLE
```

## Setup UX

Setup should feel like configuring a game match.

Sections:

1. Topic
2. Mode
3. Fighters
4. Match Rules
5. Judge
6. Start

Microcopy:

- “Choose your fighters”
- “Set the rules”
- “Bring in a judge?”
- “Start the match”

## Debate Page UX

The debate page should feel like an arena.

Top HUD:

- debate title
- round counter
- model names
- total cost
- sound toggle
- stop button

Main content:

- model A card
- model B card
- timeline of messages

During generation:

- active model pulses
- message card shows typing cursor
- thinking bubble appears
- optional typing sound

After each turn:

- message locks in
- cost badge updates
- round counter updates if needed

## Verdict UX

The verdict should feel like a final reveal.

Elements:

- “VERDICT” badge
- judge model
- one-sentence verdict
- score or winner
- strongest arguments
- weakest points
- practical conclusion
- total cost
- restart button

## Error UX

Errors should be friendly.

Examples:

### Missing API Key

```text
The arena has no power source.
Add your API key and try again.
```

### Provider Timeout

```text
The fighter froze mid-round.
Try again or switch models.
```

### Rate Limited

```text
The arena is cooling down.
Wait a moment before starting another match.
```

## Empty States

### No Topic

```text
Drop a topic into the arena first.
```

### No Model Selected

```text
Choose two fighters before starting.
```

### Judge Disabled

```text
No judge selected. The debate will end after the final round.
```

## Mobile UX

Mobile layout should prioritize readability.

Recommendations:

- stacked setup cards
- sticky start button
- compact HUD
- horizontal model cards
- full-width message cards
- collapsible cost details

## Accessibility UX

Requirements:

- all controls keyboard accessible
- focus rings visible
- reduced motion support
- sound can be disabled
- contrast strong enough
- text readable on mobile

## UX Acceptance Criteria

The flow is acceptable if:

- user understands what to do in less than 10 seconds
- debate setup feels like game configuration
- live debate has clear progress
- final verdict gives closure
- costs are visible but compact
- errors are understandable
