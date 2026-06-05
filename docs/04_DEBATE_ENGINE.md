# 04 — Debate Engine

## Purpose

The Debate Engine is the heart of AI Debate Arena.

It controls:

- debate mode
- round count
- speaker order
- round objectives
- model roles
- stop conditions
- judge timing
- session completion

The Debate Engine prevents infinite loops by design.

## Core Principle

The AI models do not run the debate.

The app runs the debate.

Each AI model receives a strict prompt for exactly one turn.

## Debate Modes

### Debate Mode

Two models take opposing sides.

Default roles:

- Model A: Pro side
- Model B: Against side

Goal:

- produce a structured argument
- directly rebut the other side
- defend the assigned stance
- avoid easy agreement

### Discussion Mode

Two models take complementary roles.

Default roles:

- Model A: Supportive Strategist
- Model B: Critical Evaluator

Goal:

- improve an idea
- identify weaknesses
- stress-test assumptions
- produce practical next steps

Discussion Mode is especially useful for:

- startup ideas
- product ideas
- essays
- personal decisions
- strategies
- research questions
- business plans

## Round Counts

Supported round counts:

- 3 rounds
- 5 rounds
- 7 rounds

No unlimited mode in MVP.

## Debate Mode Round Plans

### 3-Round Debate

| Round | Label | Model A Task | Model B Task |
|---:|---|---|---|
| 1 | Opening Arguments | Present the strongest case for the topic. | Present the strongest case against the topic. |
| 2 | Rebuttals | Directly respond to Model B’s opening. | Directly respond to Model A’s opening. |
| 3 | Final Defense | Give final defense and address the strongest objection. | Give final defense and address the strongest objection. |

### 5-Round Debate

| Round | Label | Model A Task | Model B Task |
|---:|---|---|---|
| 1 | Opening Arguments | Present the strongest case for the topic. | Present the strongest case against the topic. |
| 2 | Rebuttals | Challenge Model B’s core claim. | Challenge Model A’s core claim. |
| 3 | Counter-Rebuttals | Defend your position against the rebuttal. | Defend your position against the rebuttal. |
| 4 | Practical Examples | Use concrete examples or consequences to support your side. | Use concrete examples or consequences to support your side. |
| 5 | Final Statements | Give final concise argument for why your side is stronger. | Give final concise argument for why your side is stronger. |

### 7-Round Debate

| Round | Label | Model A Task | Model B Task |
|---:|---|---|---|
| 1 | Opening Arguments | Present the strongest case for the topic. | Present the strongest case against the topic. |
| 2 | Rebuttals | Challenge Model B’s core claim. | Challenge Model A’s core claim. |
| 3 | Counter-Rebuttals | Defend your position against the rebuttal. | Defend your position against the rebuttal. |
| 4 | Evidence & Examples | Provide examples, logic, or evidence. | Provide examples, logic, or evidence. |
| 5 | Attack Strongest Point | Attack the strongest point made by the opponent. | Attack the strongest point made by the opponent. |
| 6 | Defend Weakest Point | Acknowledge and defend your side’s weakest point. | Acknowledge and defend your side’s weakest point. |
| 7 | Final Statements | Close with the strongest version of your argument. | Close with the strongest version of your argument. |

## Discussion Mode Round Plans

### 3-Round Discussion

| Round | Label | Model A Task | Model B Task |
|---:|---|---|---|
| 1 | Build & Critique | Improve the idea and make it more practical. | Identify major weaknesses, risks, and blind spots. |
| 2 | Solutions & Stress Test | Respond with solutions to the weaknesses. | Stress-test those solutions. |
| 3 | Final Version & Risks | Present the improved final version. | Present final risks and recommendations. |

### 5-Round Discussion

| Round | Label | Model A Task | Model B Task |
|---:|---|---|---|
| 1 | Initial Build | Improve and clarify the idea. | Identify weaknesses and hidden assumptions. |
| 2 | Market / Context Fit | Explain why this could work in the target context. | Challenge market fit and feasibility. |
| 3 | Execution Plan | Propose practical execution steps. | Identify operational risks. |
| 4 | Refinement | Refine based on criticism. | Stress-test the refined version. |
| 5 | Final Recommendation | Give the best version of the idea. | Give final risks and must-fix issues. |

### 7-Round Discussion

| Round | Label | Model A Task | Model B Task |
|---:|---|---|---|
| 1 | Initial Build | Improve and clarify the idea. | Identify weaknesses and hidden assumptions. |
| 2 | User / Audience | Define target users and value proposition. | Challenge user need and willingness to pay. |
| 3 | Market / Context | Explain market opportunity. | Challenge market size and competition. |
| 4 | Product / Execution | Propose MVP and execution plan. | Identify technical and operational risks. |
| 5 | Business Model | Propose monetization and growth. | Challenge economics and scalability. |
| 6 | Risk Response | Respond to major risks. | Stress-test the responses. |
| 7 | Final Recommendation | Give the best version and next steps. | Give final risks and decision recommendation. |

## Speaker Order

For each round:

1. Model A speaks.
2. Model B speaks.

Then proceed to next round.

Judge speaks only after all rounds are complete.

## Judge Mode

Judge Mode options:

- No judge
- Auto judge
- Use Model A as judge
- Use Model B as judge
- Select third model as judge

### Recommendation

A third model is preferred for neutrality.

If Model A or B is used as judge, show UI warning:

> This judge participated in the debate, so the verdict may be less neutral.

## Stop Conditions

The debate ends when:

- all planned rounds are complete
- the user clicks stop
- a fatal provider error occurs
- max session cost is reached
- max token limit is reached

The debate should never continue beyond the selected round plan.

## Turn Object

Each turn should have a clear object.

```ts
export interface DebateTurn {
  id: string;
  roundNumber: number;
  roundLabel: string;
  speaker: "modelA" | "modelB" | "judge";
  task: string;
  role: string;
  stance?: "pro" | "against";
  modelId: string;
  status: "pending" | "streaming" | "complete" | "error";
}
```

## Session Object

```ts
export interface DebateSession {
  id: string;
  topic: string;
  mode: "debate" | "discussion";
  tone: DebateTone;
  roundCount: 3 | 5 | 7;
  judge: JudgeConfig;
  modelA: SelectedModel;
  modelB: SelectedModel;
  turns: DebateTurn[];
  messages: DebateMessage[];
  status: "setup" | "running" | "judging" | "complete" | "stopped" | "error";
  createdAt: string;
  updatedAt: string;
}
```

## Debate Message Object

```ts
export interface DebateMessage {
  id: string;
  turnId: string;
  speaker: "modelA" | "modelB" | "judge";
  modelId: string;
  providerId: string;
  role: string;
  stance?: "pro" | "against";
  roundNumber?: number;
  roundLabel?: string;
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: "USD";
  };
  latencyMs?: number;
  status: "streaming" | "complete" | "error";
  createdAt: string;
}
```

## Orchestrator Pseudocode

```ts
function createDebateSession(config: DebateConfig): DebateSession {
  validateConfig(config);

  const roundPlan = getRoundPlan(config.mode, config.roundCount);

  const turns = buildTurns({
    roundPlan,
    modelA: config.modelA,
    modelB: config.modelB,
    mode: config.mode
  });

  return {
    id: createId(),
    topic: config.topic,
    mode: config.mode,
    tone: config.tone,
    roundCount: config.roundCount,
    judge: config.judge,
    modelA: config.modelA,
    modelB: config.modelB,
    turns,
    messages: [],
    status: "setup",
    createdAt: now(),
    updatedAt: now()
  };
}

function getNextTurn(session: DebateSession): DebateTurn | null {
  return session.turns.find(turn => turn.status === "pending") ?? null;
}

function isDebateComplete(session: DebateSession): boolean {
  return session.turns.every(turn => turn.status === "complete");
}

function shouldGenerateJudge(session: DebateSession): boolean {
  return isDebateComplete(session) && session.judge.enabled;
}
```

## Anti-Repetition Rules

Each prompt should instruct the model:

- do not repeat arguments already made
- directly respond to the previous relevant message
- introduce at most 2–3 new points
- acknowledge but do not concede too easily
- stay within the assigned role
- do not ask to continue
- do not write the opponent’s response

## Context Window Strategy

Do not send the entire debate history forever.

For MVP:

- include topic
- include all previous messages for 3 rounds
- for 5/7 rounds, include:
  - opponent’s previous message
  - model’s own previous message
  - brief system-generated summary if needed later

Since MVP debates are short, full history is acceptable initially.

## Debate Engine Acceptance Criteria

The engine is acceptable if:

- 3, 5, and 7 round debates complete correctly
- speaker order is deterministic
- Judge Mode only appears after rounds are complete
- the app can stop the debate
- no model is allowed to continue the conversation beyond one turn
- Discussion Mode produces complementary analysis
- Debate Mode produces opposing arguments
