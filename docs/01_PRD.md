# 01 — Product Requirements Document

## Product Name

AI Debate Arena

## Problem

Users often want to evaluate ideas, compare AI models, or explore both sides of an argument. Current AI chat interfaces are not designed for structured multi-model debate. They usually produce one answer at a time, and model comparison tools are often technical, static, and boring.

There is an opportunity to create an engaging, gamified tool that lets users:

- compare AI models
- stress-test ideas
- generate opposing viewpoints
- receive a judge verdict
- understand token/cost implications
- enjoy the process visually

## Product Goal

Create a website where users can configure a structured AI debate or discussion between two models and watch it unfold in a playful arcade-like interface.

## MVP Goals

The MVP should prove that:

1. Users understand the concept quickly.
2. The arcade-style UI makes AI model comparison more engaging.
3. Structured rounds prevent infinite loops and repetitive model behavior.
4. Judge Mode provides a satisfying end state.
5. Cost tracking increases trust and transparency.
6. The architecture can support OpenAI, DeepSeek, and later OpenRouter.

## Core Features

### Feature 1 — Topic Input

Users must be able to enter a topic, question, claim, or idea.

Examples:

- “Should AI tools be allowed in universities?”
- “Is remote work better than office work?”
- “Evaluate my startup idea: a food waste marketplace.”
- “Should Turkey invest more in nuclear energy?”

Requirements:

- Textarea or large input box
- Suggested topic examples
- Minimum length validation
- Clear placeholder text
- Playful visual styling

### Feature 2 — Mode Selection

Users can select between two modes:

#### Debate Mode

Two models take opposing sides.

- Model A: Pro
- Model B: Against

The models should not agree too easily. They may acknowledge valid points, but they should defend their assigned side.

#### Discussion Mode

Two models take complementary roles.

Default roles:

- Model A: Supportive Strategist
- Model B: Critical Evaluator

The goal is not to “win,” but to improve the user’s idea or decision.

### Feature 3 — Model Selection

Users select Model A and Model B.

Initial supported providers:

- OpenAI
- DeepSeek

Future support:

- OpenRouter
- Anthropic
- Google Gemini
- Mistral
- Groq
- local models

Each model card should display:

- provider
- model name
- nickname/personality
- color corner
- estimated cost label
- strengths

Example:

- GPT-4.1 — “The Polished Strategist”
- DeepSeek Chat — “The Sharp Challenger”

### Feature 4 — Round Count

Users choose a finite number of rounds:

- 3 rounds: Quick Match
- 5 rounds: Standard Match
- 7 rounds: Deep Match

No infinite default loop should exist.

Each selected round count maps to a deterministic debate plan.

### Feature 5 — Tone Selection

Users choose a tone:

- Serious
- Funny
- Academic
- Aggressive
- Casual
- Startup-style
- Legal-style
- Investor-style

Tone affects prompts but should not break the debate structure.

### Feature 6 — Judge Mode

Judge Mode is optional.

Options:

- No judge
- Auto judge
- Use Model A as judge
- Use Model B as judge
- Select third model as judge

Recommendation:

- Default: Judge enabled
- Default judge: cost-efficient capable model
- UI warning: using Model A or Model B as judge may be less neutral

Judge output includes:

- short summary
- strongest argument from each side
- weakest argument from each side
- winner or stronger side
- practical conclusion
- optional scorecard

### Feature 7 — Live Debate Page

The live debate page should show:

- debate title/topic
- selected models
- current round
- current speaker
- total cost
- total tokens
- timeline of messages
- typewriter/streaming text
- cost badge under each message
- stop button
- sound toggle
- final verdict panel

### Feature 8 — Cost Tracking

Each AI response card should display:

- model name
- input tokens
- output tokens
- estimated cost
- response latency

The top bar should show:

- total estimated cost
- total messages
- current round
- debate status

### Feature 9 — Error Handling

The app should handle:

- missing API key
- provider timeout
- provider error
- invalid model
- exceeded token limit
- rate limit
- user stops debate
- judge generation failure

Errors should look playful but be useful.

Example:

> The arena lights flickered. DeepSeek did not respond. Try again or switch models.

## Out of Scope for MVP

The MVP does not need:

- user accounts
- payments
- saved debate history
- public leaderboard
- shareable URLs
- database persistence
- advanced analytics
- real-time multiplayer
- custom user-uploaded avatars
- OpenRouter integration

These can come later.

## Success Criteria

MVP is successful if:

- A user can complete a 3-round debate end-to-end.
- A user can complete a Discussion Mode session end-to-end.
- Judge Mode produces a final verdict.
- Cost tracking appears per message and in total.
- The interface clearly feels gamified.
- The debate does not loop infinitely.
- Model provider logic is isolated from UI.
- OpenAI and DeepSeek can be added without rewriting the debate engine.

## Important UX Philosophy

The product should create a feeling of:

- “I am setting up a match.”
- “I am watching two AI fighters.”
- “The debate is progressing through rounds.”
- “There will be a clear ending.”
- “I can see what this costs.”
- “This is fun, but still useful.”
