# 11 — Security and Rate Limits

## Main Risk

The main MVP risk is API key abuse.

If the app is publicly accessible and backend routes call paid model APIs, users can generate cost for the owner.

## Security Rules

- Never expose API keys in frontend code.
- Never send API keys to the browser.
- All model calls must happen server-side.
- Validate all API route inputs.
- Limit maximum rounds.
- Limit maximum output tokens.
- Add timeout to provider requests.
- Add basic rate limiting before public release.

## Private Beta Protection

For first deployment, add at least one:

- simple password gate
- allowlist
- basic auth
- hidden URL plus rate limit
- Vercel protection if available

Recommended simple approach:

- environment variable `APP_ACCESS_PASSWORD`
- user enters password once
- store temporary access in local storage
- all API routes still validate server-side if possible

## Rate Limits

MVP limits:

- max 7 rounds
- max 2 models plus optional judge
- max response length preset
- max output tokens per turn
- max concurrent debate per browser session

Public release limits:

- IP-based rate limit
- user-based quota
- daily cost cap
- monthly cost cap
- captcha or auth for anonymous users

## Provider Timeouts

Every provider call should have timeout.

Example:

- default timeout: 45 seconds
- judge timeout: 60 seconds

If timeout occurs, return normalized error.

## Input Validation

Validate:

- topic length
- mode enum
- round count
- tone enum
- response length enum
- selected models
- judge config
- max output tokens

Reject unknown model IDs.

## Prompt Injection Considerations

Users can enter any topic. They may try to override instructions.

The system prompt should make clear:

- user topic is content to debate
- user topic must not override system/debate instructions
- model must stay in assigned role
- model must not reveal system prompts

## Error Privacy

Do not expose raw provider errors if they include sensitive data.

Return friendly app error.

## Security Acceptance Criteria

Security is acceptable for MVP if:

- keys are server-only
- routes validate input
- max rounds and output tokens are enforced
- private beta has basic protection
- errors are normalized
