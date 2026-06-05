# Master Prompt for Claude Code

Use this prompt after creating a fresh Next.js project and copying this documentation pack into the project root.

```text
You are working on a project called AI Debate Arena.

Before writing any code, read these files carefully:

- CLAUDE.md
- README.md
- docs/00_PROJECT_BRIEF.md
- docs/01_PRD.md
- docs/02_DESIGN.md
- docs/03_ARCHITECTURE.md
- docs/04_DEBATE_ENGINE.md
- docs/05_PROMPTING.md
- docs/06_API_CONTRACTS.md
- docs/07_PROVIDER_INTEGRATION.md
- docs/08_COST_TRACKING.md
- docs/09_UX_FLOWS.md
- docs/10_DATA_MODEL.md
- docs/11_SECURITY_RATE_LIMITS.md
- docs/12_SOUND_ANIMATION.md
- docs/13_ROADMAP.md
- docs/14_TEST_PLAN.md
- docs/15_AGENTIC_WORKFLOW.md
- docs/16_BACKLOG.md
- docs/17_ACCEPTANCE_CRITERIA.md

Your job is to build the MVP of AI Debate Arena in a controlled, phased way.

Important product summary:
AI Debate Arena is a gamified web app where users enter a topic, select two AI models, choose Debate Mode or Discussion Mode, choose 3/5/7 rounds, optionally enable Judge Mode, and watch two AI models debate or discuss the topic in an arcade-style interface. The product should feel like a browser-based mini-game, not a generic AI SaaS dashboard.

Core principle:
The AI models must not control the debate flow. The application must control speaker order, round plan, stop conditions, judge timing, and cost tracking. Each model should only generate one turn at a time under strict prompts.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- API routes
- Provider abstraction layer
- Local state for MVP
- OpenAI and DeepSeek providers later
- Mock provider first

Implementation order:
1. First, summarize your understanding of the project and identify any assumptions.
2. Then implement Phase 1 only: static UI with mock data.
3. Do not add real OpenAI or DeepSeek calls in Phase 1.
4. Follow docs/02_DESIGN.md strictly.
5. Build reusable components, not one giant page.
6. After Phase 1, wait for review before implementing provider integrations.

Phase 1 requirements:
- Create the main app structure.
- Create arcade-style UI components.
- Create Home, Setup, Debate, and Result experiences.
- Use mock model data.
- Use fake debate messages.
- Simulate streaming text visually if possible.
- Show fake cost badges and total cost.
- Include Judge Mode UI as a selectable option.
- Include 3/5/7 round selector.
- Include sound toggle UI, even if real sounds are added later.
- Ensure responsive layout.

Do not:
- expose API keys
- call real AI providers yet
- build a generic chatbot
- ignore the design docs
- let models control flow
- create unlimited debate loops
- hardcode provider-specific logic into UI components

After finishing Phase 1:
- list files created/modified
- explain how to run the app
- explain what remains for Phase 2
```
