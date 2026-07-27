# 07 — Provider Integration

> Updated 2026-06-10. Source of truth: `src/lib/providers/` and
> `src/lib/models/modelRegistry.ts`.

## Goal

Three backends — **OpenAI**, **DeepSeek**, and **OpenRouter** — behind one provider interface. The debate engine never knows which provider is in use; it only calls `provider.generate(input)`.

## Provider Interface (`types.ts`)

```ts
generate(input: GenerateInput): Promise<GenerateResult>
```

- **Input:** system prompt, user prompt, temperature, max output tokens, web-search flag, timeout, abort signal, kind (`turn | judge`).
- **Output:** content, token usage (incl. cached input), latency, finish reason, citations (when web search ran).

`openaiCompatible.ts` implements the shared OpenAI-wire-format logic; the three providers configure it (base URL, key, model quirks).

## Backends

| Backend | Env var | Models | Web search |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY` | GPT-5.x and GPT-4.x families | injected (app-run Brave) |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek V4 Pro, V4 Flash | injected |
| OpenRouter | `OPENROUTER_API_KEY` | 21+ free models (Qwen, Llama, Kimi, GLM, Gemma, …) | native `:online` (hybrid mode) or injected |

There is **no mock provider** anymore — it was removed after real integration. Without keys, `/api/health` reports `no-keys` and the UI explains what's missing.

## Registry (`providerRegistry.ts`)

- `getProvider(id)` — lookup by provider id.
- `generateWithRetry(provider, input, attempts = 3, deadlineMs)` — exponential backoff on transient errors (`PROVIDER_ERROR`, `PROVIDER_TIMEOUT`, `RATE_LIMITED`).
- `providerAvailability()` — which backends have keys (drives `/api/health`).
- `resolveAutoJudge(session)` — picks a neutral judge by preference order over available backends.

## Model Registry (`modelRegistry.ts`)

The catalog (56+ models) carries display info (name, nickname, brand, family, color), `costTier` (`free | low | medium | high` → FREE/$/$$/$$$), a 0–100 debate-suitability rating, max output tokens, reasoning-effort caps, Turkish-fluency flag, and web-search capability.

**Reasoning-effort caps (`reasoningEffort`) are for default-on thinkers ONLY.** OpenRouter's `reasoning: { effort }` param caps the hidden thinking of models that reason by default (Kimi, GLM, Qwen, MiniMax, Xiaomi MiMo, Grok 4.3/4.5, Gemini 2.5 Pro, Nemotron Super) — but on opt-in reasoners it *switches thinking on* instead. A July 2026 blanket tag made Mistral Medium burn 3,577 thinking tokens per turn (0 without the param) and Gemma 4 take 183s instead of 5.8s — the "Mistral is slow" bug, fixed 2026-07-16 by probing every OpenRouter model bare vs `effort: "low"` and keeping the tag only where it measurably reduces thinking. When adding a model, probe before tagging. Helper functions group models by brand/family per locale and preview the auto-judge pick client-side.

## Error Normalization

Provider-specific failures become app errors: missing key → `MISSING_API_KEY`, timeout → `PROVIDER_TIMEOUT`, invalid model → `INVALID_MODEL`, 429 → `RATE_LIMITED`, anything else → `PROVIDER_ERROR`.

## Invariants

- All providers share the same interface; usage and cost data are normalized.
- API keys are server-side only.
- Adding a backend means: a provider module, registry entry, catalog entries, and pricing rows — no UI or engine rewrite.
