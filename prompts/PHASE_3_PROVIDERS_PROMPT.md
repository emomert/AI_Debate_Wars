# Phase 3 — Real Providers Prompt

```text
Implement Phase 3 only: OpenAI and DeepSeek provider integration.

Read:
- docs/03_ARCHITECTURE.md
- docs/06_API_CONTRACTS.md
- docs/07_PROVIDER_INTEGRATION.md
- docs/11_SECURITY_RATE_LIMITS.md

Requirements:
- Create shared provider interface.
- Add OpenAI provider.
- Add DeepSeek provider.
- Add provider registry.
- Keep API keys server-side only.
- Add .env validation.
- Add normalized provider errors.
- Make the debate engine call providers through the shared interface.
- Keep mock provider available.
- Do not rewrite UI unless necessary.

Do not:
- expose API keys
- hardcode provider calls in UI
- remove mock provider
- ignore error states

After implementation, explain how to configure .env and test one real turn.
```
