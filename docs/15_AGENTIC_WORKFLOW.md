# 15 — Agentic Workflow for Claude Code

## Goal

Use Claude Code in a controlled, phased way so the project does not become messy.

Do not ask Claude Code to build the entire product in one uncontrolled step.

## Recommended Workflow

### Step 1 — Create Project

Create a new Next.js project manually or ask Claude Code to create it.

Recommended:

```bash
npx create-next-app@latest ai-debate-arena --typescript --tailwind --eslint --app
```

Then copy this documentation pack into the root.

### Step 2 — Ask Claude to Read Docs

Prompt Claude Code to read:

- `CLAUDE.md`
- all files in `/docs`
- all files in `/prompts`
- all files in `/tasks`

Then ask it to summarize implementation plan before coding.

### Step 3 — Phase 1: Static UI

Build static UI with mock data.

No real APIs.

Key pages:

- home
- setup
- debate
- result

Goal:

- nail visual identity first

### Step 4 — Phase 2: Mock Debate Engine

Implement deterministic debate flow using mock provider.

Goal:

- confirm rounds, turns, judge, state, costs work

### Step 5 — Phase 3: Provider Integration

Add OpenAI and DeepSeek.

Goal:

- real one-turn generation through backend routes

### Step 6 — Phase 4: Streaming and Cost

Add streaming and cost calculations.

Goal:

- improve experience and transparency

### Step 7 — Phase 5: Polish

Add:

- animations
- sound
- mobile polish
- errors
- accessibility
- final sharing

## Agent Instructions

When working with Claude Code, use constraints:

- ask for a plan before implementation
- ask it to modify only relevant files
- ask it to run type checks
- ask it to explain what changed
- ask it not to remove docs
- ask it not to introduce unnecessary dependencies

## Suggested Claude Code Commands

### Initial Planning

```text
Read CLAUDE.md and all files inside /docs. Do not write code yet. Summarize the product, architecture, design direction, and implementation plan. Then list the first 10 files you would create or modify.
```

### Static UI

```text
Implement Phase 1 only: static UI with mock data. Do not add real AI provider calls. Follow docs/02_DESIGN.md strictly. Build the Home, Setup, Debate, and Result screens with reusable components.
```

### Debate Engine

```text
Implement Phase 2 only: deterministic mock debate engine. Use mock provider responses. The app should complete 3, 5, and 7 round debates and optional judge verdict without real APIs.
```

### Real Providers

```text
Implement Phase 3 only: add OpenAI and DeepSeek behind the shared provider interface. Keep API keys server-side. Do not alter UI design unless necessary.
```

## Workflow Acceptance Criteria

The workflow is successful if:

- docs guide development
- UI is built before real providers
- debate engine works with mock provider
- provider layer stays isolated
- project remains maintainable
