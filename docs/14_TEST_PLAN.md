# 14 — Test Plan

## Testing Goals

Test:

- debate engine correctness
- prompt behavior
- provider integration
- cost calculation
- UI states
- mobile layout
- error handling
- no infinite loops

## Unit Tests

### Debate Engine

Test:

- 3-round Debate Mode creates correct turns
- 5-round Debate Mode creates correct turns
- 7-round Debate Mode creates correct turns
- 3-round Discussion Mode creates correct turns
- 5-round Discussion Mode creates correct turns
- 7-round Discussion Mode creates correct turns
- getNextTurn returns correct turn
- isDebateComplete returns true only when all turns complete
- judge triggers only after debate complete

### Cost Calculation

Test:

- input cost calculation
- output cost calculation
- total cost calculation
- unknown token usage fallback
- total session cost aggregation

### Validators

Test invalid:

- empty topic
- invalid mode
- invalid round count
- missing model
- invalid judge config
- unsupported provider

## Integration Tests

Test:

- mock provider full debate
- OpenAI provider one turn
- DeepSeek provider one turn
- verdict generation
- provider timeout
- provider missing API key
- normalized error handling

## UI Tests

Test:

- home page renders
- setup form validates
- start button disabled until valid
- model selection works
- round selector works
- judge selector works
- debate timeline updates
- cost badge appears
- verdict appears
- stop button works
- error messages appear

## Prompt Tests

Manually test:

- Debate Mode creates opposition
- Discussion Mode creates useful critique
- models do not write opponent response
- models do not ask to continue
- models avoid repetition
- judge does not continue debate
- tone changes output style

## Mobile Tests

Check:

- iPhone width
- Android width
- tablet width
- desktop width
- sticky controls
- readable messages
- no horizontal overflow

## Accessibility Tests

Check:

- keyboard navigation
- focus states
- contrast
- reduced motion
- sound toggle
- readable font sizes

## Acceptance Test Scenario

### Scenario 1: Basic Debate

Input:

- Topic: “Should universities ban AI tools?”
- Mode: Debate
- Models: mock A, mock B
- Rounds: 3
- Judge: enabled

Expected:

- 6 model turns
- judge verdict
- total cost shown
- no infinite loop

### Scenario 2: Startup Discussion

Input:

- Topic: “AI debate website for comparing models”
- Mode: Discussion
- Models: mock A, mock B
- Rounds: 5
- Judge: enabled

Expected:

- supportive and critical roles
- practical output
- final risks and next steps
- verdict or summary

### Scenario 3: Provider Error

Input:

- missing OpenAI key
- select OpenAI model
- start turn

Expected:

- friendly missing key error
- no crash
- retry option or model switch suggestion

## Test Plan Acceptance Criteria

The app is testable if:

- mock provider can run complete debates
- engine logic has deterministic tests
- UI handles all states
- provider failure does not break session
