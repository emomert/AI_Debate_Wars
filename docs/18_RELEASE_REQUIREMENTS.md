# 18 — Release requirements

Updated September 8, 2026. The original audit's engineering findings are addressed in the accepted release. Production migration 0015 is applied; application rollout uses the existing GitHub/Vercel integration. See [implementation and commands](27_AUDIT_FIXES_2026-09-08.md).

## Ready in this checkout

| Original finding | Implementation |
| --- | --- |
| Free verdict authorization | Authenticated owner, six stored generated turns and original match charge |
| Generation replay | Atomic fenced lease, bounded retries, stored responses |
| Underpriced legacy formats | Canonical three-round/short/English Debate Mode policy |
| Concurrent/unrecorded spend | Per-attempt atomic reserve and idempotent settlement; uncertain work remains booked |
| Price/margin mismatch | Fixed match quotes and real net pack assumptions including judge/retry/search costs |
| Vulnerable dependencies | Patched Next 15, Vitest 5 and transitive dependencies |
| Missing lint/CI | ESLint plus Node 24 GitHub Actions checks |
| Unsafe migration replay | Version/checksum ledger, verified baseline, advisory lock, pending-only apply |

## Activate the changes

1. Review the changed files and the database baseline dry run.
2. Record the verified baseline through 0014 without replaying SQL; apply pending migration 0015. The runner refuses an unbaselined populated schema.
3. Run locked installation, lint, TypeScript, tests and production build. Publish through the existing GitHub/Vercel workflow.
4. Start a new authenticated match after release. Existing saved sessions remain readable; old sessions without a server record cannot resume paid generation.

SUPABASE_SERVICE_ROLE_KEY and the public Supabase configuration are required for production generation even if coin charging is disabled. Local-only free development is explicitly separate. Keep the database migration ahead of the application release. A code rollback also restores the old generation behavior.

## Owner and operational items

- The connected team reported Vercel Hobby, whose [plan documentation](https://vercel.com/docs/plans/hobby) restricts commercial use. A suitable plan requires an owner billing action; this task does not purchase or change it.
- Payment code/configuration is present. Real purchases, refunds and webhook failure scenarios were not exercised in this fix; use the payment test environment for release acceptance.
- Provider invoices and future tariffs can differ from application estimates. Maintain balances/alerts and review the documented 5× estimated-cost target against observed net revenue.
- Keep backups/recovery, support and content handling operational. The changes add generation records to exports and account deletion, and update the privacy description.

Accepted for production release on September 8, 2026. The existing Supabase database was baselined through 0014 without replaying SQL, then migration 0015 was applied successfully. The ledger reports 15 versions and no pending migrations. This release is published through GitHub main and the existing Vercel integration; consult the deployment/check status for the current rollout result. No payment or hosting-plan purchase was made. Final focused validation is recorded in [the fix report](27_AUDIT_FIXES_2026-09-08.md).
