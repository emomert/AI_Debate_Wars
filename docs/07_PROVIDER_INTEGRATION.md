# 07 — Provider Integration

> Updated 2026-09-08. Source of truth: `src/lib/providers/` and
> `src/lib/models/modelRegistry.ts`.

## Per-attempt budgets

All production paid calls run inside a request spend context. The shared Chat Completions adapter reserves funds before each actual fetch, including retries and provider parameter fallback. Usage is reconciled before empty-answer errors, so hidden-thinking-only attempts are accounted for. Timeouts retain bookings. Deep Debate always uses the app-managed Brave search path; legacy `DEEP_SEARCH_MODE=hybrid` no longer enables native search.

## September verification

The catalog now has 103 models, including 13 additions verified with authenticated model lists and successful small text completions. See [the audit](26_PROJECT_AUDIT_2026-09-08.md) for exact IDs, pricing, tests, and candidates withheld for access/capacity errors. Default fighters and Auto judge preferences are unchanged.

- Astra uses `max_completion_tokens`, `reasoning_effort: low`, and no temperature. GPT-6 is recognized alongside GPT-5/o-series; cache-write usage is retained for billing.
- Fable 5.1 sets `supportsTemperature: false`, passed from catalog to provider config.
- New OpenRouter reasoning caps were selected by bare-versus-low probes. Gemini 3.7 stays uncapped because low effort did not reduce thinking; its estimate still includes reasoning. These are compatibility checks, not comprehensive latency benchmarks.
- Existing DeepSeek V4 Pro/Flash aliases already point at updated revisions. Added `deepseek-v4-flash-vision-exp`, announced August 21, for text debates; no image upload was introduced. No September 8 DeepSeek announcement was confirmed.
- A key-present badge does not verify individual model permissions. Test account access before exposing newly advertised IDs.

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
| OpenAI | `OPENAI_API_KEY` | GPT-6 Astra, GPT-5.x and GPT-4.x families | injected (app-run Brave) |
| DeepSeek | `DEEPSEEK_API_KEY` | V4 Pro, V4 Flash, V4 Flash Vision Experimental | injected |
| OpenRouter | `OPENROUTER_API_KEY` | Paid Claude, Gemini, Grok, Qwen, Meta, Kimi, GLM, and other brands | native `:online` (hybrid mode) or injected |

There is **no mock provider** anymore — it was removed after real integration. Without keys, `/api/health` reports `no-keys` and the UI explains what's missing.

## Registry (`providerRegistry.ts`)

- `getProvider(id)` — lookup by provider id.
- `generateWithRetry(provider, input, attempts = 3, deadlineMs)` — exponential backoff on transient errors (`PROVIDER_ERROR`, `PROVIDER_TIMEOUT`, `RATE_LIMITED`).
- `providerAvailability()` — which backends have keys (drives `/api/health`).
- `resolveAutoJudge(session)` — picks a neutral judge by preference order over available backends.

## Model Registry (`modelRegistry.ts`)

The catalog carries display info (name, optional legacy nickname, brand, family, color), `costTier` (`low | medium | high`), an editorial 0–100 debate-suitability sorting hint, max output tokens, reasoning/sampling capabilities, Turkish-fluency flag, and web-search capability. Explicit coin prices live separately in `economy.ts`; monetary cost UI is hidden.

**Reasoning-effort caps (`reasoningEffort`) are for default-on thinkers ONLY.** OpenRouter's `reasoning: { effort }` param caps the hidden thinking of models that reason by default (Kimi, GLM, Qwen, MiniMax, Xiaomi MiMo, Grok 4.3/4.5, Gemini 2.5 Pro, Nemotron Super) — but on opt-in reasoners it *switches thinking on* instead. A July 2026 blanket tag made Mistral Medium burn 3,577 thinking tokens per turn (0 without the param) and Gemma 4 take 183s instead of 5.8s — the "Mistral is slow" bug, fixed 2026-07-16 by probing every OpenRouter model bare vs `effort: "low"` and keeping the tag only where it measurably reduces thinking. When adding a model, probe before tagging. Helper functions group models by brand/family per locale and preview the auto-judge pick client-side.

## Error Normalization

Provider-specific failures become app errors: missing key → `MISSING_API_KEY`, timeout → `PROVIDER_TIMEOUT`, invalid model → `INVALID_MODEL`, 429 → `RATE_LIMITED`, anything else → `PROVIDER_ERROR`.

## Invariants

- All providers share the same interface; usage and cost data are normalized.
- API keys are server-side only.
- Adding a backend means: a provider module, registry entry, catalog entries, and pricing rows — no UI or engine rewrite.
