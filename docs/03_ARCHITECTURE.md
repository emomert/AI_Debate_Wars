# 03 — Technical Architecture

## Architecture Summary

AI Debate Arena should use a clean layered architecture:

1. UI Layer
2. Debate Orchestration Layer
3. Prompt Construction Layer
4. Provider Abstraction Layer
5. Cost Tracking Layer
6. API Routes / Backend Layer

The key architectural rule is:

> UI components should never directly call OpenAI, DeepSeek, or any model provider.

## Recommended Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- API routes
- Server-side provider calls
- Local state for MVP
- Optional later: Supabase/Postgres
- Optional later: Redis rate limiting

## Suggested Folder Structure

```txt
/src
  app
    page.tsx
    setup
      page.tsx
    debate
      page.tsx
    result
      page.tsx
    api
      debate
        start
          route.ts
        turn
          route.ts
        verdict
          route.ts
      health
        route.ts

  components
    game
      GameShell.tsx
      DottedBackground.tsx
      ArcadeButton.tsx
      IconButton.tsx
      SoundToggle.tsx
      HelpButton.tsx
      FloatingBadge.tsx
      GamePanel.tsx

    setup
      TopicInput.tsx
      ModeSelector.tsx
      ModelSelector.tsx
      RoundSelector.tsx
      JudgeSelector.tsx
      ToneSelector.tsx
      SetupSummaryCard.tsx

    debate
      DebateArena.tsx
      DebateTimeline.tsx
      DebateMessageCard.tsx
      AIModelCard.tsx
      RoundCounter.tsx
      CostBadge.tsx
      ThinkingBubble.tsx
      VerdictCard.tsx
      DebateControls.tsx

    result
      FinalSummaryCard.tsx
      ScoreBreakdown.tsx
      SharePanel.tsx

  lib
    debate
      orchestrator.ts
      roundPlans.ts
      promptBuilder.ts
      debateTypes.ts
      validators.ts
      sessionState.ts

    providers
      types.ts
      openaiProvider.ts
      deepseekProvider.ts
      mockProvider.ts
      providerRegistry.ts

    cost
      pricing.ts
      calculateCost.ts
      tokenUsage.ts

    audio
      soundManager.ts

    utils
      ids.ts
      time.ts
      errors.ts

  styles
    globals.css
```

## Layer Responsibilities

### UI Layer

Responsibilities:

- render setup form
- render model selection
- render debate timeline
- render streamed content
- render cost badges
- render errors
- trigger backend API calls
- play animations and sounds

Must not:

- know provider-specific APIs
- calculate provider pricing directly
- construct detailed model prompts
- decide round logic

### Debate Orchestration Layer

Responsibilities:

- generate debate plan
- decide next turn
- track current round
- track speakers
- stop when complete
- trigger judge step if enabled
- validate session state

This layer is deterministic.

It should never ask an LLM:

> What should happen next?

### Prompt Construction Layer

Responsibilities:

- build system prompt
- build turn prompt
- inject topic, role, stance, tone, round objective
- include relevant previous messages
- enforce response length
- instruct model not to continue beyond one turn

### Provider Abstraction Layer

Responsibilities:

- expose a common interface
- call OpenAI, DeepSeek, or mock providers
- normalize outputs
- normalize usage data
- support streaming where possible
- surface provider-specific errors as app-level errors

### Cost Tracking Layer

Responsibilities:

- store pricing table
- calculate per-message cost
- calculate total session cost
- support unknown usage fallback
- display estimated costs clearly

## Provider Interface

All providers should implement a common interface.

```ts
export type ProviderId = "openai" | "deepseek" | "openrouter" | "mock";

export interface ModelConfig {
  id: string;
  provider: ProviderId;
  displayName: string;
  nickname: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  supportsStreaming: boolean;
  maxOutputTokens: number;
}

export interface GenerateTurnInput {
  model: ModelConfig;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  stream?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GenerateTurnResult {
  content: string;
  usage?: TokenUsage;
  latencyMs: number;
  finishReason?: string;
  raw?: unknown;
}
```

## API Routes

### `/api/debate/start`

Creates an initial debate session object and round plan.

### `/api/debate/turn`

Generates one model turn.

Important:

- This endpoint should generate exactly one AI response.
- It should not run the full debate automatically in the first version unless explicitly designed.
- It should receive current session state and return updated state/message.

### `/api/debate/verdict`

Generates final judge verdict if Judge Mode is enabled.

## State Strategy for MVP

For MVP, use client-side state for debate session data.

Advantages:

- faster development
- no database needed
- easier debugging

Limitations:

- refresh loses session
- no history
- no sharing
- no auth-level controls

Later, add database persistence.

## Future Database Tables

Potential tables:

- users
- debate_sessions
- debate_messages
- debate_verdicts
- model_usage_events

See `10_DATA_MODEL.md`.

## Streaming Strategy

Options:

1. Simulated streaming from complete response
2. Real provider streaming
3. Server-Sent Events
4. ReadableStream from API route

Recommended implementation order:

1. mock simulated streaming in UI
2. non-streaming real provider call
3. real streaming from backend

## Security Requirements

- API keys must only exist server-side.
- API routes should validate input.
- Use max token limits.
- Use round limits.
- Use rate limits before public launch.
- Add password gate for private beta.
- Never return raw provider error details to the client if they contain sensitive data.

## Rate Limiting

For private beta, minimum controls:

- app access password
- max rounds
- max output tokens
- provider timeout
- basic IP-based rate limit if possible

For public release:

- user accounts
- quota
- per-user monthly usage
- cost cap
- abuse detection

## Error Handling

Use normalized errors.

```ts
export type AppErrorCode =
  | "MISSING_API_KEY"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_MODEL"
  | "INVALID_SESSION"
  | "RATE_LIMITED"
  | "TOKEN_LIMIT_EXCEEDED"
  | "UNKNOWN_ERROR";
```

UI messages should be playful but clear.

## Architecture Acceptance Criteria

The architecture is acceptable if:

- providers can be swapped without changing UI
- OpenRouter can be added with minimal changes
- debate flow is deterministic
- costs are calculated outside UI components
- API keys are never exposed
- mock provider works without real API keys
- debate can complete without infinite loops
