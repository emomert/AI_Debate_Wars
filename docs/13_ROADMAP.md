# 13 — Roadmap

Updated September 8, 2026. See [initial audit](26_PROJECT_AUDIT_2026-09-08.md) and [follow-up fixes](27_AUDIT_FIXES_2026-09-08.md).

## Existing product

- English Debate Mode, three short rounds, mandatory blind judge and arcade UI.
- OpenAI, DeepSeek and paid OpenRouter catalog, including 13 verified September additions.
- App-managed Brave search and citations for Deep Debate.
- Supabase accounts, private history, community features, analytics, claim-gated daily coins and configured Polar integration.

## Accepted September 8 release

- Authenticated server-owned transcripts, fixed price quotes, atomic generation leases and cached responses.
- Paid-match verification before included judging and canonical new-match format enforcement.
- Atomic per-attempt spend reservations with failed/aborted work accounted for.
- Economics using discounted net pack revenue, fees, reasoning, retries, judge and search allowances.
- Patched dependencies, working ESLint, Node 24 CI, version/checksum migration runner.
- Export and privacy updates for generation records.

## Next operational steps

1. Database baseline and migration 0015 are complete. Track the accepted release through GitHub checks and Vercel production status.
2. Resolve the connected Hobby plan's suitability for a monetized service through the owner's billing settings.
3. Verify payment lifecycle cases in the payment test environment and maintain provider balances, alerts and backups.
4. Recheck model retirements/account availability and compare actual costs with pricing assumptions over time.

## Later product work

Templates, rematches, tournaments, classroom features, richer exports and leaderboards remain possible additions. Turkish UI, Blitz, voices and cost displays remain disabled. Moderation remains opt-in; those existing product decisions are unchanged.
