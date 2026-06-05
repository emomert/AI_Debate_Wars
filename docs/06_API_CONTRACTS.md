# 06 — API Contracts

## API Philosophy

The frontend should communicate with backend API routes through typed request and response objects.

The frontend should never directly call model provider APIs.

## Route Overview

MVP routes:

- `POST /api/debate/start`
- `POST /api/debate/turn`
- `POST /api/debate/verdict`
- `GET /api/health`

Optional later:

- `POST /api/debate/run`
- `GET /api/models`
- `POST /api/share`
- `GET /api/debate/:id`

## POST `/api/debate/start`

Creates a debate session and deterministic round plan.

### Request

```ts
export interface StartDebateRequest {
  topic: string;
  mode: "debate" | "discussion";
  modelA: {
    providerId: string;
    modelId: string;
  };
  modelB: {
    providerId: string;
    modelId: string;
  };
  roundCount: 3 | 5 | 7;
  tone: DebateTone;
  responseLength: "short" | "medium" | "long";
  judge: JudgeConfig;
}
```

### Response

```ts
export interface StartDebateResponse {
  session: DebateSession;
}
```

### Validation

Reject if:

- topic is too short
- round count is invalid
- model provider is unsupported
- judge config is invalid
- model A or B is missing

## POST `/api/debate/turn`

Generates exactly one AI turn.

### Request

```ts
export interface GenerateTurnRequest {
  session: DebateSession;
  turnId: string;
}
```

### Response

```ts
export interface GenerateTurnResponse {
  message: DebateMessage;
  updatedSession: DebateSession;
}
```

### Streaming Version

If streaming is implemented, response may use `ReadableStream`.

Streaming event types:

```ts
type StreamEvent =
  | { type: "start"; turnId: string; modelId: string }
  | { type: "token"; content: string }
  | { type: "usage"; usage: TokenUsage; cost: CostBreakdown }
  | { type: "complete"; message: DebateMessage }
  | { type: "error"; error: AppError };
```

## POST `/api/debate/verdict`

Generates judge verdict.

### Request

```ts
export interface GenerateVerdictRequest {
  session: DebateSession;
}
```

### Response

```ts
export interface GenerateVerdictResponse {
  verdict: DebateVerdict;
  updatedSession: DebateSession;
}
```

## GET `/api/health`

Returns system health.

### Response

```ts
export interface HealthResponse {
  ok: boolean;
  providers: {
    openai: boolean;
    deepseek: boolean;
  };
  timestamp: string;
}
```

## Shared Types

### DebateTone

```ts
export type DebateTone =
  | "serious"
  | "funny"
  | "academic"
  | "aggressive"
  | "casual"
  | "startup"
  | "legal"
  | "investor";
```

### JudgeConfig

```ts
export interface JudgeConfig {
  enabled: boolean;
  mode: "none" | "auto" | "modelA" | "modelB" | "thirdModel";
  model?: {
    providerId: string;
    modelId: string;
  };
}
```

### DebateVerdict

```ts
export interface DebateVerdict {
  id: string;
  sessionId: string;
  judgeModelId: string;
  content: string;
  winner?: "modelA" | "modelB" | "tie" | "not_applicable";
  summary: string;
  strongestModelA?: string;
  strongestModelB?: string;
  weakestModelA?: string;
  weakestModelB?: string;
  practicalConclusion?: string;
  usage?: TokenUsage;
  cost?: CostBreakdown;
  latencyMs?: number;
  createdAt: string;
}
```

## Error Response

```ts
export interface ApiErrorResponse {
  error: {
    code: AppErrorCode;
    message: string;
    details?: unknown;
  };
}
```

## Frontend Handling

The frontend should:

- show loading state while request is pending
- show streaming state while content arrives
- show partial content if streaming fails late
- show friendly error messages
- allow retrying failed turns
- allow stopping debate

## API Acceptance Criteria

The API contract is acceptable if:

- routes are typed
- invalid input is rejected
- provider-specific errors are normalized
- one turn route generates only one turn
- verdict route only runs after debate completion
- frontend does not know provider internals
