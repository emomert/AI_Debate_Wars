# Debator project audit — 2026-09-08

## Follow-up status

The user requested remediation after this initial audit. The engineering fixes are accepted for production release; see [the fix report and release procedure](27_AUDIT_FIXES_2026-09-08.md). The findings, initial coin prices and validation results below describe the original audit snapshot, not the current code. Production migration 0015 is now applied; the accepted release uses the existing GitHub/Vercel deployment integration. Hosting-plan changes remain an owner billing action.

## Original scope and result

Reviewed the moved Windows checkout, provider adapters/catalog/pricing, coin gates, session validation, spend controls, payment webhook, deployment configuration, migration tooling, and project documentation. Used a smaller model for the README and straightforward repository review. Application code was changed only for the catalog, provider compatibility, related cost accounting, and regression checks. The larger security and dependency findings were open at that point and are addressed by the follow-up above.

The app builds and its existing architecture remains usable. This is a targeted engineering audit, not a claim that every route, database policy, payment scenario, or UI interaction has been exhaustively tested.

## Verified environment

- Checkout: `C:/Users/Mert Oruntak/projects/discus_ai`; Git remote remains `emomert/AI_Debate_Wars`.
- Baseline local commit `dd20dcb` is **three documentation commits ahead** of `origin/main` (`ba37ff6`). Their only file difference is `docs/25_MARKETING_CAMPAIGN.html`; application source matches. Nothing was reset, merged, pushed, or deployed during this audit.
- Vercel project `debator` is GitHub-connected, production deployment `ba37ff6` is `READY`, Node is `24.x`, and the domains include `debator.xyz` and `www.debator.xyz`. The runtime-error query returned no errors in its selected window; that is not historical proof of zero errors.
- Vercel team plan returned **Hobby**. Its [current documentation](https://vercel.com/docs/plans/hobby) restricts use to personal, non-commercial projects. Resolve hosting-plan suitability before commercial operation. Current platform duration limits are higher than the old docs claimed; the app itself still explicitly sets 60 seconds and a 55-second request deadline.
- Local provider, Supabase, signing, and Polar configuration values are present. Values were not printed or copied into this report. Presence does not establish that all production settings or payment credentials are correct.
- Read-only PostgreSQL metadata confirmed `coin_daily_claims` exists and `coin_status()` returns `claimed_today`: migration 0014's daily-claim schema is present despite old “not applied” notes. `rl_hit`, `spend_allowed`, and `spend_record` deny execution to `anon` and `authenticated`, consistent with migration 0013. No database migration or user-data mutation was performed.
- No stale absolute checkout path was found in the runtime configuration inspected. Git deployments do not require a local `.vercel` link. Run local scripts from the repository root; demo regeneration additionally needs Chrome and `ffmpeg`.

## Open findings, in priority order

### P1 — Verdict route can perform paid judging without a paid match

**Evidence:** `src/app/api/debate/verdict/route.ts` trusts a client-supplied completed session and calls only `ensureJudgeCharged`. In `src/lib/coins/server.ts`, that function returns before authentication when `judgeCoinCost` is zero. Auto and `modelA`/`modelB` modes are free. Consequently, a consistent fabricated transcript can reach a paid judge without a signed-in user or a paid match, including a premium fighter used as its own judge. Existing IP/spend limits still apply; the coin/auth boundary does not.

**Next change:** authenticate and verify an owned, paid match before any verdict, including included/free judges. Resolve the judge from a server-owned match record. Add route tests showing fabricated sessions, unauthenticated requests, and unpaid matches cannot call a provider. This audit did not exercise the bypass against production.

### P1 — Idempotent coin charging does not make generation idempotent

**Evidence:** `matchChargeKey` is stable for a match; `coin_spend_match` returns `ALREADY` for that charge. Turn progress, message content, and completion flags still come from the request. There is no server-owned turn result or unique generation claim in `src/app/api/debate/turn/route.ts`. Replaying a previously valid pending-turn request causes another paid generation without another match charge. Repeated identical judge requests have the same issue. HMAC charge signing prevents charge-key forgery, but cannot prevent this replay.

**Next change:** persist match/turn ownership and state; atomically claim each `(user, match, turn)` generation, store its response, and return that response on retries. Define recovery for abandoned claims and provider failures. This requires a coordinated database/API change, not a client-side button lock.

### P1 — Installed dependencies have reported security advisories

`npm audit --json` reported **11 affected packages: 1 critical, 6 high, 3 moderate, 1 low**. Installed versions include Next.js `15.5.19` and Vitest `2.1.9`. Package-level severity is not proof that every advisory is exploitable through this app.

- Next.js advisories include [App Router denial of service](https://github.com/advisories/GHSA-m99w-x7hq-7vfj); its reported affected range includes the installed version.
- Vitest's critical [UI-server file access/execution advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp) concerns exposed development tooling, not the deployed Next.js runtime. This project normally runs `vitest run`, but the vulnerable dependency remains installed.
- Other affected packages: browserslist, nanoid, PostCSS, sharp, Vite, esbuild, `@vitest/mocker`, `vite-node`, and `postcss-selector-parser`.

**Next change:** upgrade to supported patched versions, review compatibility (especially the test-runner major version), regenerate the lockfile, and rerun build/tests/audit. Dependencies were not broadly upgraded as part of the requested catalog refresh.

### P2 — Server accepts formats the current product no longer sells

**Evidence:** `src/lib/debate/validators.ts` permits 3/5/7 rounds, medium/long lengths, and hidden modes. Only Deep Debate gets a turn-specific 3-round guard. `matchCoinCost` does not price round count, so an API caller can request seven ordinary rounds for the three-round fighter price. Keeping legacy sessions readable does not require allowing fresh generation with legacy settings.

**Next change:** add a new-turn policy guard for the enabled mode, three rounds, short response length, and canonical turn plan. Keep legacy viewing separate. Decide explicitly whether partially completed legacy matches can resume.

### P2 — Spend caps are best-effort accounting limits, not hard reservations

**Evidence:** `src/lib/security/rateLimit.ts` checks `spend_allowed` before work and records cost afterwards. Concurrent calls can all pass the same remaining balance. The routes record successful results; failed/aborted calls, an initial token-limit attempt, or a search followed by generation failure can incur upstream charges absent from the ledger. Fallback limits are per process and reset on cold starts.

**Next change:** atomically reserve a conservative maximum before each paid attempt, reconcile it with returned usage, and preserve failure/timeout accounting. Retain provider-side spending controls and prepaid balances where available. Do not describe the current ledger as a guaranteed upper bound on the provider invoice.

### P2 — The advertised margin floor uses a nominal coin value

**Evidence:** `src/lib/coins/economy.ts` uses `$0.05` per coin for its 5× estimate, but the 700-coin pack sells for `$19.99`, or approximately `$0.02856` per coin before fees and taxes. A 20-coin Astra fighter has an estimated API cost of `$0.1918` under the existing three-short-round profile; that is about **2.98× gross revenue/API cost** at the largest pack, not 5×. The estimate excludes the included judge, Deep Debate expansion, retries, unusually long reasoning, and many operating costs. Several older OpenAI reasoning models also remain outside the estimator's explicit reasoning set.

**Changed here:** added reasoning estimates and explicit coin prices for the new entries; updated DeepSeek Pro and GLM 5.2 from 1 to 2 coins after published price increases. Strengthened the coverage test so a fallback price cannot masquerade as an explicit price. Kept existing pack offers and the nominal-margin policy unchanged.

**Next change:** set an economic target using actual pack revenue, payment fees, judge/search costs, and measured usage distributions. Adjust the pricing policy only after that calculation; the current test is a nominal comparison, not a profitability guarantee.

### P2 — Replaying all SQL migrations is unsafe on the current schema

**Evidence:** `scripts/apply-migrations.mjs` has no applied-migration ledger and defaults to replaying every file, committing each separately. Migration 0012 declares a two-column `coin_status()` return type; 0014 drops/recreates it with three columns. Replaying 0012 after 0014 will fail because `CREATE OR REPLACE FUNCTION` cannot change that return type. Earlier files can already have committed, including old grant/function definitions that later hardening migrations were intended to replace.

**Next change:** track applied versions and checksums, baseline the existing database without replaying SQL, and apply only new migrations. Until then, inspect schema state and pass only reviewed pending files. Do not run the no-argument replay on production.

### P2 — Lint and CI claims exceed the repository's checks

**Evidence:** `package.json` defines `next lint`, but ESLint is absent and `next.config.mjs` explicitly skips linting during builds. No GitHub Actions workflow is present. The margin-test comment previously said failures stop CI, but this checkout has no such CI job.

**Next change:** configure a noninteractive lint command and a CI workflow for locked dependency installation, typecheck, tests, and production build. Build success currently means compilation/type validation; it does not mean lint passed.

## Model and cost update

Added **13 models** that returned a nonempty successful text completion using the configured provider accounts. Existing working models remain selectable; default fighters and the inexpensive Auto judge remain unchanged. Model ratings are editorial sorting hints, not new benchmark results. DeepSeek Vision is usable for text debates; this change does not add image upload.

Sources checked on September 8:

- [OpenAI Astra model](https://developers.openai.com/api/docs/models/gpt-6-astra) and [migration parameters](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra).
- [DeepSeek models/pricing](https://api-docs.deepseek.com/quick_start/pricing/) and [Vision announcement](https://api-docs.deepseek.com/news/news260821/). The latest verifiable announcement was **August 21**, not a confirmed September 8 release. V4 Pro/Flash's existing API aliases already resolve to their newer revisions.
- [OpenRouter model catalog API](https://openrouter.ai/api/v1/models), plus authenticated provider catalog checks and small text probes. All pre-existing catalog IDs appeared in their corresponding model lists.

Astra uses `max_completion_tokens`, `reasoning_effort: low`, and no temperature. Fable 5.1 omits unsupported temperature. New OpenRouter reasoning caps were added only where a bare-versus-low probe reduced thinking tokens. Gemini 3.7 remains uncapped after its low-effort probe increased them. These short probes verify compatibility, not a universal latency guarantee.

Updated 19 existing OpenRouter input/output price pairs. DeepSeek uses current **peak** prices conservatively: Flash/Vision `$0.44` input, `$0.014` cached input, `$1.32` output; Pro `$1.32`, `$0.044`, `$3.96`, all per million tokens. Off-peak actual charges can be lower. Astra costs `$10` input, `$1` cached input, `$12.50` cache writes, `$50` output per million; its new cache-write accounting preserves that surcharge. OpenRouter routed prices can vary from catalog estimates; provider invoices remain authoritative.

Not added: `meta/muse-spark-1.3` returned HTTP 403; `qwen/qwen3.8-flash` and `nvidia/nemotron-3.5-lightning` returned HTTP 429 on two probes each. Recheck access/capacity before adding. Batch/free/accelerated variants, translation-only models, and new specialized backends were outside this interactive paid debate catalog update. Astra Pro was not listed by the direct OpenAI account used here.

Upcoming retirements: recheck [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations) before October 23 (`gpt-4.1-nano`) and December 11 (listed GPT-5 mini/nano snapshots). Model retirement needs a legacy-session strategy because generation validators currently require an ID in the active catalog.

## Validation and boundaries

- Before changes: TypeScript passed, 105 tests passed, production build passed.
- After changes: TypeScript passed, **112 tests across 23 files passed**, production build passed.
- New regressions check Astra's request body/cache-write costs, unchanged GPT-5/GPT-4 behavior, Fable's sampling parameters, unique catalog IDs, explicit API/coin prices, and bounded cache-write accounting.
- Browser: local production `/setup` rendered Astra and DeepSeek Vision. Selecting both updated the Match Card to **21 coins** with the existing Auto judge. No match was started in the browser.
- Provider probes used a generic two-sentence public-library prompt, small token limits, and no private app data. They do not validate full three-round debates, long judges, every older model, or every provider's peak latency.
- Checkout purchases/refunds, authenticated end-to-end match billing, all RLS policies, secrets history, and all mobile/accessibility flows were not exhaustively exercised. No production exploit or load test was run.
- At the end of the initial catalog-only pass, the 11 dependency advisories and listed findings were unresolved. No deployment, database migration, account change, payment, or message to another person was made.

## Added models — initial audit prices (superseded by the follow-up)

| Model | API ID | Backend | Input/output USD per 1M | Coins per fighter |
| --- | --- | --- | --- | --- |
| GPT-6 Astra | `gpt-6-astra` | openai | 10 / 50 | 20 |
| DeepSeek V4 Flash Vision (Experimental) | `deepseek-v4-flash-vision-exp` | deepseek | 0.44 / 1.32 | 1 |
| Fable 5.1 | `anthropic/claude-fable-5.1` | openrouter | 10 / 50 | 20 |
| Qwen 3.8 Max (0902) | `qwen/qwen3.8-max-0902` | openrouter | 2 / 6 | 4 |
| Qwen 3.8 27B | `qwen/qwen3.8-27b` | openrouter | 0.42 / 3 | 2 |
| Qwen 3.8 2.4T A95B | `qwen/qwen3.8-2.4t-a95b` | openrouter | 2 / 6 | 4 |
| Gemini 3.8 Flash | `google/gemini-3.8-flash` | openrouter | 0.75 / 3.75 | 2 |
| Gemini 3.7 Flash | `google/gemini-3.7-flash` | openrouter | 0.75 / 3.75 | 2 |
| Grok 4.6 | `x-ai/grok-4.6` | openrouter | 2 / 6 | 4 |
| GLM 5.3 | `z-ai/glm-5.3` | openrouter | 1.4 / 4.4 | 2 |
| GLM 5.3 Flash | `z-ai/glm-5.3-flash` | openrouter | 0.075 / 0.25 | 1 |
| Hunyuan 4 (Preview) | `tencent/hy4-preview` | openrouter | 0.834 / 2.501 | 2 |
| Muse Glimmer 30B | `meta/muse-glimmer-30b` | openrouter | 0.3 / 1.1 | 1 |

Coin changes affect new server-side charge calculations. The current charge key includes the amount, so a match resumed across a price-changing deployment can receive a different charge key; server-owned versioned match prices should accompany the planned billing hardening.
