# 04 — Debate Engine

> Updated 2026-06-10. Source of truth: `src/lib/debate/` (`debateTypes.ts`,
> `roundPlans.ts`, `orchestrator.ts`). The `/report` page renders the live
> round plans and prompts.

## Purpose

The Debate Engine controls debate mode, round count, speaker order, round objectives, model roles, stop conditions, judge timing, and session completion. It prevents infinite loops by design.

## Core Principle

The AI models do not run the debate. The app runs the debate. Each model receives a strict prompt for exactly one turn.

## Modes

- **Debate Mode** (the product): Model A argues pro, Model B argues against. Models must defend their assigned stance and not collapse into agreement.
- **Discussion Mode** (legacy, hidden): complementary roles (Supportive Strategist vs. Critical Evaluator), no winner. Removed from the setup UI; round plans and types remain in code (including Turkish variants) for backward compatibility.

## Round Counts

3 (Quick Match), 5 (Ranked Match), or 7 (Championship). No unlimited mode exists.

## Debate Round Plans (`roundPlans.ts`)

### 3 Rounds

| Round | Label | Model A Task | Model B Task |
|---:|---|---|---|
| 1 | Opening Arguments | Present the strongest case for the topic. | Present the strongest case against the topic. |
| 2 | Rebuttals | Directly respond to Model B's opening. | Directly respond to Model A's opening. |
| 3 | Final Defense | Give final defense and address the strongest objection. | Give final defense and address the strongest objection. |

### 5 Rounds

| Round | Label |
|---:|---|
| 1 | Opening Arguments |
| 2 | Rebuttals |
| 3 | Counter-Rebuttals |
| 4 | Practical Examples |
| 5 | Final Statements |

### 7 Rounds

| Round | Label |
|---:|---|
| 1 | Opening Arguments |
| 2 | Rebuttals |
| 3 | Counter-Rebuttals |
| 4 | Evidence & Examples |
| 5 | Attack Strongest Point |
| 6 | Defend Weakest Point |
| 7 | Final Statements |

English and Turkish variants of every plan live side by side in `roundPlans.ts`.

## Speaker Order

For each round: Model A speaks, then Model B. The judge speaks only after all rounds are complete.

## Match Options (DebateConfig)

- **Tone:** `serious | aggressive | casual | custom` (custom = free text), configurable per fighter.
- **Response length:** strictly `short` in the UI since July 2026 (the picker was removed; setup coerces persisted configs). The engine still accepts `short | medium | long` (word targets enforced in the prompt) so legacy shared/persisted matches render unchanged.
- **Pace:** `manual` (user advances each turn) or `auto`.
- **Deep Debate:** boolean; turns receive web-search results and must cite sources. Only allowed for fighters that support web search (`assertDeepTurnAllowed`).

## Judge Mode

- `none` — match ends after the final round.
- `auto` — a neutral, cheap-but-capable model is selected from the available backends (`resolveAutoJudge`; the setup UI previews the pick).
- `thirdModel` — user picks a specific neutral judge.
- `modelA` / `modelB` exist in the type for backward compatibility but were removed from the UI (a participant judging its own debate is not neutral).

The judge sees the transcript **blind** (no model names) and must produce a decisive, winner-leaning verdict with 0–100 scores. The result screen allows changing the judge and re-judging.

## Stop Conditions

The debate ends when all planned rounds complete, the user stops it, or a fatal provider error occurs. Server-side rate limits and spend caps can also refuse further turns. It never continues beyond the selected round plan.

## Key Types (`debateTypes.ts`)

- `DebateTurn` — id, round number/label, speaker, task, role, stance, modelId, status (`pending | streaming | complete | error`).
- `DebateMessage` — content plus usage, cost, latency, citations, status.
- `DebateSession` — config + turns + messages + verdict + cost summary + status (`setup | running | judging | complete | stopped | error`).
- `DebateVerdict` — winner (`modelA | modelB | tie | not_applicable`), scores, reasoning, strongest/weakest arguments.

## Orchestrator (`orchestrator.ts`)

- `createDebateSession(config)` — validates config, builds the full deterministic turn list.
- `getNextTurn(session)` — first pending turn; the app decides who speaks.
- `isDebateComplete(session)` — all turns complete.
- `shouldGenerateJudge(session)` — complete + judge enabled.

Sessions are created client-side; each turn is generated server-side via `/api/debate/turn`, which re-validates the session (`validators.ts`) before any paid work.

## Anti-Repetition Rules

Every prompt instructs the model to: not repeat earlier arguments, directly answer the opponent's previous message, introduce at most a few new points, not concede easily, stay in role, never ask to continue, and never write the opponent's response.

## Context Strategy

Debates are short and bounded (max 14 fighter turns), so the full prior transcript is included in each turn prompt. Prompt sections are ordered so that stable content comes first, making provider prompt-caching effective.
