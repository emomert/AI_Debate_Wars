# 06 — API Contracts

> Updated 2026-06-10. Source of truth: `src/app/api/**/route.ts(x)` and the
> shared types in `src/lib/debate/debateTypes.ts`.

## API Philosophy

The frontend talks to typed backend routes only; it never calls a model provider directly. There is **no `/api/debate/start`** — the session is created client-side by the orchestrator (it contains no secrets) and every route re-validates it server-side.

## Routes

### POST `/api/debate/turn`

Generates exactly one AI turn.

- Validates the session (`assertValidSession`, `assertDeepTurnAllowed`, transcript consistency, string-length bounds).
- Enforces per-IP rate limits and spend caps **before** any paid work.
- Resolves the turn's model, builds prompts, calls the provider via the registry (with retry), runs Deep Debate search injection when enabled, computes cost.
- Returns one `DebateMessage` with usage, cost breakdown, latency, and citations.
- Not streaming — one full response per call. `maxDuration = 60` (reasoning models can take 20–40s).

### POST `/api/debate/verdict`

Generates the judge verdict, only after the debate is complete.

- Resolves the judge (auto / third model), builds a blind judge prompt from the transcript, parses the response into a structured `DebateVerdict` (winner, 0–100 scores, reasoning, strongest/weakest arguments).
- Rate-limited and spend-capped like `/turn`. `maxDuration = 60`.

### POST `/api/topic/check`

AI sanity-check / improvement of a proposed topic.

- Uses a cheap, fast model (DeepSeek V4 Flash by default, falls back to OpenAI/OpenRouter).
- Returns JSON: verdict (`good | weak | unclear`), assessment, up to 3 sharper alternatives.
- Rate-limited; spend recorded. `maxDuration = 30`.

### GET `/api/health`

Reports which backends are configured, with no secrets:

```ts
{
  ok: boolean;
  mode: "live" | "no-keys";
  providers: { openai: boolean; deepseek: boolean; openrouter: boolean; webSearch: boolean };
}
```

The setup UI uses this to pick defaults and show hints.

### GET `/api/og?d=<payload>`

Dynamic 1200×630 Open Graph image for share links (edge runtime, Satori). Renders the base64url verdict payload; fetches brand fonts at render time with a safe fallback. No DB, no auth.

## Share Payloads (not an API)

Share links are stateless: `/s?d=<base64url JSON>` carries topic, fighter names, winner, scores, and reasoning (`src/lib/share/shareLink.ts`). Payloads are length- and charset-validated before decoding.

## Error Response

```ts
{ error: { code: AppErrorCode; message: string } }
```

`AppErrorCode`: `MISSING_API_KEY | PROVIDER_TIMEOUT | PROVIDER_ERROR | INVALID_MODEL | INVALID_SESSION | RATE_LIMITED | TOKEN_LIMIT_EXCEEDED | UNKNOWN_ERROR`. Raw provider errors are never forwarded.

## Contract Invariants

- One turn route call generates exactly one turn.
- The verdict route refuses incomplete debates.
- Inputs are validated and bounded on every route.
- Rate limiting and spend caps run before provider calls on every paid route.
- The frontend never learns provider internals.
