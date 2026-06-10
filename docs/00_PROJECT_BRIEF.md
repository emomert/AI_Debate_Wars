# 00 — Project Brief

## One-Sentence Description

Debator (AI Debate Arena) is a gamified web app where two AI models debate a user's topic under structured rules, with selectable rounds, visible costs, optional web-search-grounded arguments, and an optional AI judge verdict.

## Core Product Idea

The user sets up an "arena":

1. enters a topic (optionally AI-checked and sharpened)
2. selects two AI fighters from a large model catalog
3. chooses 3, 5, or 7 rounds, tone, response length, and pace
4. optionally enables Deep Debate (web search + citations)
5. optionally enables a neutral AI judge
6. starts the match and watches the models argue in a lively arcade interface
7. sees cost, token usage, response time, and the final verdict
8. can share the verdict, save the match to their profile, and rematch

## Why This Product Is Interesting

Most AI comparison tools feel technical or boring. Debator turns model comparison into a playful experience.

The product is not simply "two chatbots talking." It is:

- a structured debate engine
- a model comparison interface
- a gamified thinking tool
- a way to stress-test ideas
- a way to observe how different models reason

## Target Users

### Primary Users

- AI enthusiasts
- students
- founders
- product managers
- creators
- people comparing model behavior
- people who want to evaluate an idea from multiple perspectives

### Secondary Users

- educators
- debate clubs
- content creators
- researchers
- prompt engineers

## Main Use Cases

### 1. Debate a public question

> Should universities ban AI tools?

One model argues in favor. The other argues against. Each defends its assigned side across deterministic rounds.

### 2. Compare model reasoning

> GPT vs DeepSeek on whether AI regulation slows innovation.

The user sees how each model argues, rebuts, and reasons — with real per-turn costs visible.

### 3. Evidence-grounded debate

With Deep Debate enabled, fighters search the web and cite sources, turning the match into a referenced argument rather than pure opinion.

### 4. Get a verdict

With the judge enabled, a neutral model evaluates the transcript blind (no model names) and produces a decisive verdict: winner, scores, strongest and weakest arguments, and reasoning. The verdict can be shared as an auto-unfurling link with a generated image.

## Product Positioning

> Two AI models enter an arcade debate arena. You choose the topic, the rules, the fighters, and the judge.

Slogans:

- "Make AIs fight your ideas."
- "Turn model comparison into a game."
- "Your topic. Two models. One arena."
- "Arcade interface. Serious intelligence."

## Non-Negotiable Product Principles

1. The UI must not feel like a normal AI SaaS dashboard.
2. The debate must be structured and finite.
3. The models must not decide the flow themselves.
4. Costs must be visible and transparent.
5. The user must feel in control of the arena.
6. The output must be useful, not just entertaining.
7. Login is a perk (history/stats), never a gate.

## Historical Note

An earlier "Discussion Mode" (supportive strategist vs. critical evaluator, no winner) shipped in the MVP and was later removed from the UI to focus the product on debates. Its types remain in the codebase for backward compatibility.
