# AI Debate Arena — Project Documentation Pack

This documentation pack defines the product, visual identity, architecture, debate engine, prompting system, provider layer, cost tracking, UX flows, roadmap, and implementation workflow for **AI Debate Arena**.

AI Debate Arena is a gamified web app where users enter a topic, select two AI models, choose a structured debate or discussion mode, configure rounds and judge settings, and watch the models debate in a colorful browser-game style interface.

## Recommended Workflow

Use this pack with Claude Code or another agentic coding tool.

1. Create a fresh Next.js project.
2. Copy all files from this documentation pack into the project root.
3. Start with `CLAUDE.md`.
4. Ask the AI coding agent to read all docs before writing code.
5. Implement in phases:
   - Phase 0: documentation validation
   - Phase 1: static UI with mock data
   - Phase 2: mock debate engine
   - Phase 3: real OpenAI and DeepSeek integration
   - Phase 4: streaming and cost tracking
   - Phase 5: polish, sound, animation, responsiveness

## Suggested Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- API routes
- Provider abstraction layer
- Local state for MVP
- Optional later: Supabase/Postgres + authentication

## Important Principle

The AI models should **not** control the debate flow.  
The application should control the round plan, speaker order, stop conditions, judge behavior, cost tracking, and session state.

The AI models should only generate one turn at a time under strict role and round instructions.

## Running the App

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run typecheck`.

Flow: **Home** → **Setup** (`/setup`) → **Debate** (`/debate`) → **Result**
(`/result`). Each turn is generated one at a time by a server route; the app —
never a model — controls speaker order, rounds, stop conditions and judge timing.

### Mock mode (no API keys)

Works out of the box. The default fighters are **Mock Sage** and **Mock Rebel**
(provider `mock`), which run instantly and free through the same API routes as
real providers. **"Try a Sample"** on Home jumps straight into a mock match.

### Live mode (OpenAI / DeepSeek)

Add keys to a `.env.local` (or `.env`) file, then restart:

```bash
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=...
```

In **Setup → Choose Your Fighters**, real models show a **“ready”** badge when a
key is present and **“needs key”** when not. Keys are read **server-side only**
(in `/api/debate/*` routes) and are never sent to the browser. If you pick a
real model without its key, the arena shows a friendly "needs API key" error with
a Retry button — mock fighters keep working regardless.

The judge’s **Auto** option picks a neutral judge based on available keys
(OpenAI → DeepSeek → Mock). You can also force Model A/B or a specific third model
as judge (with a bias warning).

### Environment variables

See `.env.example`. Only `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` are needed for
the MVP; everything else is for later phases. Optional overrides:
`OPENAI_BASE_URL`, `DEEPSEEK_BASE_URL`.

### Status

✅ **MVP usable locally** — deterministic debate engine, provider abstraction
(mock + OpenAI + DeepSeek), server-side API routes, per-message + total cost
tracking, Judge Mode with verdict, simulated streaming, error/empty/loading
states, responsive arcade UI. OpenRouter is intentionally not wired yet but the
provider layer is ready for it (one registry entry).

