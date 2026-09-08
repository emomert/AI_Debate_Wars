# 11 — Security and Rate Limits

Updated September 8, 2026. Source: generationPolicy.ts, generationStore.ts, spendBudget.ts, rateLimit.ts and migration 0015. These changes are accepted for release and production migration 0015 is applied. See the [release procedure and rollout status](27_AUDIT_FIXES_2026-09-08.md).

## Generation ownership

Production matches require authentication and server-owned state, regardless of the coin flag. The service-role client reads only the authenticated user's generation record. A fabricated browser transcript cannot authorize a turn or judge. Provider IDs, display names, round tasks, speaker order and prompts are reconstructed from the catalog and stored transcript.

Only English Debate Mode with three short rounds and Auto/selected judging can generate. Deep Debate additionally requires serious tone. Old saved sessions remain viewable, but sessions without a server generation record cannot resume or rejudge.

The first turn stores a canonical configuration and price snapshot. Each turn asserts the original match charge. Judging requires all six server-owned turns; Auto is included in the match, while selected judges use their stored prices. A changed prompt-affecting configuration with the same session ID is rejected.

An atomic database claim permits one active operation per match. Tokens fence completions, leases expire after 120 seconds, and completed responses are cached by turn/judge. Paid-work attempts are bounded to three claims per operation; denials before any spend booking do not consume attempts. Retries inside a provider call are separately reserved. All generation mutation RPCs are service-role-only.

## Rate and spend limits

Per-IP fixed-window rate limits run before route work. Defaults are maintained in rateLimit.ts: turn 60/min, verdict 24/min, topic check 12/min, TTS 20/min; community operations and checkout have their own limits. RL_WINDOW_SECONDS defaults to 60. Cached generation still observes rate limits but does not require unused spend allowance.

Daily spend defaults: SPEND_GLOBAL_DAILY_USD=15 and SPEND_IP_DAILY_USD=3. Every actual provider or search attempt calls spend_reserve before dispatch. Reservations and settlements share a UTC-day database lock, so simultaneous instances cannot book the same remaining allowance. Known usage reconciles once against its booking day. Timeouts, disconnects, missing usage and settlement outages keep the booking. The ledger includes failed attempts even though message summaries describe successful results only.

Production paid work fails closed if storage or reservation RPCs are unavailable. A local development process can use an in-memory budget when Supabase is absent; that is not a production fallback. Rate limiting retains its separate in-process backstop. Topic checks remain available before sign-in but are protected by distributed dollar reservations and rate limits.

Reservations use conservative input-byte and completion-token estimates with maintained tariffs. OpenRouter's reported cost is preferred when available. Additional fees or changed upstream tariffs can exceed an estimate, so this is not an invoice guarantee. Keep provider-side balance/alert controls appropriate to the account.

Brave searches are independently booked before search, including when later generation fails. The default/minimum fee is $0.005; SEARCH_COST_USD can raise it. SEARCH_DAILY_MAX is a separate global query count backstop. Native OpenRouter search is disabled. Speech remains disabled; if enabled, its binary response has no usage receipt, so its configured conservative booking is retained.

## Other protections

- API keys, charge signing and service-role access stay server-only. Raw provider errors are not returned to browsers.
- Request bodies and input fields are bounded. Provider requests have deadlines, completion ceilings and abort signals.
- Vercel-supplied IP headers identify the caller. A move to another host must revisit proxy header trust in clientIp() and the authentication callback.
- Community routes require their existing authentication/input/RLS checks and do not use provider dollar budgets for database-only actions.
- User topics and web snippets are framed as data, not instructions. Prompt wording is defense in depth; it does not replace ownership, authorization or spending controls.
- Moderation remains opt-in under the existing owner decision. MODERATION_ENABLED=true enables the free topic/publication checks, which retain their documented fail-open behavior. This is separate from the fail-closed spending policy.

## Persistence and operations

Raw generation/spend tables deny client writes. Account export returns only that caller's generation records, and account deletion cascades to them. Deleting saved profile history alone does not delete the anti-replay record. Privacy text describes this distinction.

Migration 0015 must be applied before this application version. The runner tracks applied checksums and versions, baselines existing schema without replay, and commits each migration with its ledger row. CI runs lint, typecheck, tests and build; dependency audits remain time-specific. See [release requirements](18_RELEASE_REQUIREMENTS.md) for activation and owner billing steps.
