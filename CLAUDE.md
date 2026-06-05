# CLAUDE.md

## Project Name

AI Debate Arena

## Product Summary

AI Debate Arena is a gamified web application where users create structured debates or discussions between two AI models. Users choose a topic, select two AI models, configure the debate mode, choose the number of rounds, optionally enable a judge, and watch the models argue in a playful arcade-style interface.

The product should feel like a browser-based mini-game, not a generic AI SaaS dashboard. The interface should be colorful, tactile, animated, and highly interactive, while the AI outputs should remain thoughtful, structured, and useful.

The desired product feeling is:

> Arcade interface, serious intelligence.

## Core Product Principle

The AI models must not control the debate flow.

The application must control:

- who speaks next
- which round is active
- what the task of each round is
- when the debate ends
- whether a judge appears
- which model acts as judge
- how costs are calculated
- when the session is complete

The AI models only generate individual turn responses based on strict prompts.

## MVP Scope

The MVP must include:

- Topic input
- Debate Mode
- Discussion Mode
- Two selectable AI models
- Selectable round count: 3, 5, or 7
- Optional Judge Mode
- Optional third judge model
- Live debate screen
- Streaming or simulated streaming text
- Per-message token and cost display
- Total session cost display
- Final verdict if judge is enabled
- Arcade-style visual design
- Sound toggle
- Mobile-responsive layout

## Initial Providers

The first real implementation should support:

- OpenAI
- DeepSeek

The provider architecture must allow adding OpenRouter later without rewriting debate logic.

## Required Architecture Rules

- Never expose API keys on the frontend.
- All model calls must go through backend API routes.
- Provider integrations must use a shared provider interface.
- Pricing must live in a configurable pricing file.
- UI components must not contain provider-specific logic.
- Debate orchestration must be separated from UI components.
- Prompt construction must be separated from provider calls.
- Round logic must be deterministic.
- The system must prevent infinite debate loops by design.
- The UI must support mock mode before real provider integration.

## Recommended Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Backend API routes
- Provider abstraction layer
- Local state for MVP
- Optional later: Supabase or Postgres

## Development Workflow

Build the project in phases.

### Phase 0 — Documentation Validation

Read all files in `/docs`.

Before writing code, summarize:

- the product goal
- MVP scope
- design language
- architecture plan
- debate engine plan
- API route plan
- unresolved questions or assumptions

Do not implement code until the plan is clear.

### Phase 1 — Static UI

Build the full UI using mock data only.

No real AI API calls yet.

The debate screen should simulate streamed AI responses with fake text so that the visual experience can be tested before backend integration.

### Phase 2 — Mock Debate Engine

Implement the debate orchestrator using mock providers.

The system should be able to run a full 3, 5, or 7 round debate without real model calls.

### Phase 3 — Real Provider Integration

Add OpenAI and DeepSeek providers behind a common provider interface.

The debate engine should not know which provider is being used.

### Phase 4 — Streaming and Cost Tracking

Add real streaming responses where possible.

Track:

- input tokens
- output tokens
- total tokens
- estimated cost per message
- total debate cost
- response latency

### Phase 5 — Polish

Add:

- sound effects
- animated transitions
- mobile responsiveness
- error states
- loading states
- empty states
- final share page
- better model avatars
- accessibility improvements

## Design Direction

The UI must feel like an arcade debate game.

Use:

- dotted grid background
- thick black borders
- rounded cards
- chunky shadows
- bright colors
- playful badges
- animated buttons
- character-like AI model cards
- cost counters
- round counters
- sound toggle
- help button

The UI must not look like:

- a corporate SaaS dashboard
- a plain chatbot
- a generic AI wrapper
- a documentation website
- a serious enterprise tool

## Important Implementation Notes

The debate should never run as an uncontrolled loop.

Each debate session should have a fixed debate plan generated before the first model response.

Each turn should include:

- debate mode
- topic
- current round
- round objective
- model role
- assigned stance
- previous relevant messages
- tone
- max response length
- instruction not to continue beyond the current turn

## Do Not Do

Do not:

- build a generic chatbot interface
- let models decide the next speaker
- allow unlimited back-and-forth by default
- hardcode pricing inside UI components
- expose API keys client-side
- mix provider logic with UI
- create vague prompts
- let models agree too easily in Debate Mode
- let models repeat the same arguments across rounds
- skip error handling
- ignore mobile layout
