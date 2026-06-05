# 07 — Provider Integration

## Goal

Support OpenAI and DeepSeek in MVP with a provider abstraction that can later support OpenRouter.

## Provider Rule

The debate engine should never care whether the selected model comes from OpenAI, DeepSeek, OpenRouter, or a mock provider.

It should only call:

```ts
provider.generate(input)
```

## Provider Registry

Create a registry:

```ts
export const providerRegistry = {
  openai: openaiProvider,
  deepseek: deepseekProvider,
  mock: mockProvider
};
```

## Model Registry

Create a model list:

```ts
export const models = [
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    displayName: "GPT-4.1 Mini",
    nickname: "The Polished Strategist",
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    supportsStreaming: true,
    maxOutputTokens: 4096
  },
  {
    id: "deepseek-chat",
    provider: "deepseek",
    displayName: "DeepSeek Chat",
    nickname: "The Sharp Challenger",
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    supportsStreaming: true,
    maxOutputTokens: 4096
  }
];
```

Pricing numbers should be filled from current provider pricing pages before real launch.

## OpenAI Provider

Responsibilities:

- read `OPENAI_API_KEY`
- call OpenAI chat/completions or responses API
- support streaming if possible
- normalize usage
- normalize errors

## DeepSeek Provider

Responsibilities:

- read `DEEPSEEK_API_KEY`
- call DeepSeek API
- support streaming if possible
- normalize usage
- normalize errors

## Mock Provider

The mock provider is essential.

It allows:

- UI development without API keys
- debate engine testing
- predictable responses
- offline demos

Mock provider should simulate:

- latency
- streaming
- token usage
- cost

## OpenRouter Future Integration

OpenRouter should be added as another provider, not as a rewrite.

Expected changes:

- add `OPENROUTER_API_KEY`
- add openRouterProvider
- add models to model registry
- update providerRegistry

No UI rewrite should be needed.

## Provider Error Normalization

Provider-specific errors should become app errors.

Examples:

- missing API key -> `MISSING_API_KEY`
- timeout -> `PROVIDER_TIMEOUT`
- invalid model -> `INVALID_MODEL`
- rate limit -> `RATE_LIMITED`
- unknown provider error -> `PROVIDER_ERROR`

## Provider Acceptance Criteria

The provider layer is acceptable if:

- mock provider works
- OpenAI and DeepSeek use same interface
- errors are normalized
- usage/cost data is normalized
- API keys are server-side only
- adding OpenRouter requires minimal changes
