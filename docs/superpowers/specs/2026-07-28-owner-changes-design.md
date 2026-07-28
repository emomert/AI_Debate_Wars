# 2026-07-28 — Owner change batch: pricing copy, daily-allowance claim, help removal, verdict card

Owner-directed batch of four changes. Decisions taken in the brainstorming pass are
recorded inline; nothing here is speculative.

## 1. Pricing page copy

Two removals on `/pricing`:

- The three "what that buys" example bullets on every pack card
  (`≈ N quick matches`, `≈ N premium bouts`, `≈ N flagship fights`) **and** the
  `examplesIntro` heading above them. The `QUICK_MATCH_COINS` /
  `PREMIUM_BOUT_COINS` / `FLAGSHIP_FIGHT_COINS` constants that fed them become
  dead and go too.
- The page subtitle "Every fighter has a coin price. A match costs the two
  fighters added together — the Auto judge is included." Both facts are already
  stated in the "How coins work" rules list below, so this is pure duplication.
  The `subtitle` key is removed and the `<p>` that renders it goes with it.

Files: `src/lib/i18n/dictionaries/en/coins.ts`, `.../tr/coins.ts`,
`src/app/pricing/page.tsx`.

## 2. Daily allowance becomes claim-gated

### The problem with the current model

Today the daily allowance is **implicit**: `coin_status()` reports
`daily_spent`, and both the client and `coin_spend_match` derive
`available = 15 − daily_spent`. A user who never opens the site still
"has" 15 coins waiting — there is nothing to claim, and no signal that
visiting daily matters.

### Design

Keep the allowance **computed, never credited**. Claiming does not insert coins
into `coin_ledger`; it records that today was claimed, and the existing
`15 − daily_spent` computation is gated on that flag. This is the whole
anti-exploit story:

- A replayed, forged, or spammed claim call cannot mint coins — the best it can
  do is a no-op `insert … on conflict do nothing`.
- `primary key (user_id, claim_date)` makes double-claiming structurally
  impossible, not merely guarded.
- `claim_date` is UTC, matching how `daily_spent` is already bucketed, so the
  claim window and the spend window can never drift apart.
- Everything is keyed on `auth.uid()` inside a `SECURITY DEFINER` function; a
  hostile client calling the RPC over PostgREST can only ever claim for itself.
- Non-rollover is preserved for free: an unclaimed day simply has no flag, and
  yesterday's flag doesn't make yesterday's coins spendable today.

### Migration `0014_daily_claim.sql`

```sql
create table public.coin_daily_claims (
  user_id    uuid not null references auth.users (id) on delete cascade,
  claim_date date not null,                    -- UTC, matches daily_spent bucketing
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);
```

RLS on; one own-rows `select` policy; no write policy (definer-only).

`coin_status()` gains a third output column `claimed_today boolean`. Because
the OUT signature changes, the migration must `drop function if exists
public.coin_status();` before recreating it, then re-`grant execute … to
authenticated`.

`coin_spend_match` is recreated in the same migration for two reasons: its
`select pb, ds into … from public.coin_status() as s(pb, ds)` breaks against the
new three-column shape, and the allowance itself must now be gated:

```sql
v_daily_available := case when v_claimed_today
  then greatest(0, c_daily_allowance - v_daily_spent)
  else 0 end;
```

Everything else about `coin_spend_match` — the server-authoritative
`c_daily_allowance := 15`, the ignored `p_allowance`, the advisory lock, the
idempotency check — is carried over from migration 0013 unchanged.

New `coin_claim_daily()` returns `(ok, result, coins, purchased_balance,
daily_spent)` with result `CLAIMED` | `ALREADY` | `AUTH` | `RATE_LIMITED`. It
reuses the `rl_hit` brute-force guard the promo RPC already uses (the table
write is trivially cheap, but an unbounded client-callable insert shouldn't be
able to churn the table).

**The migration is written but NOT applied by this batch.** Applying it against
production is an owner action.

### Client

- `CoinStatus` gains `claimedToday: boolean`; `dailyRemaining` becomes
  `claimedToday ? max(0, FREE_DAILY_COINS − daily_spent) : 0`, so the header
  chip stops counting unclaimed coins as spendable.
- New `claimDaily(supabase)` helper alongside `fetchCoinStatus`.
- New `ClaimDailyButton` component with two variants: `chip` (header, beside the
  coin balance) and `panel` (inside the /pricing free-tier card). Renders
  nothing when signed out, when coins are disabled, or when today is already
  claimed. On success it fires `COINS_CHANGED_EVENT` so the balance chip
  updates without a reload.

Placement was decided by the owner: **header + /pricing**, not setup.

## 3. Remove "How to play"

The help modal and its `?` trigger go entirely: delete
`src/components/game/HelpButton.tsx`, its mount in `GameShell.tsx`, and the
`help` block from `shell.ts` (en + tr).

## 4. Verdict card

Four changes to `VerdictCard.tsx` plus three copy removals.

**Winner badge.** A second badge in the card's top-right corner, styled to
match the existing `🏆 VERDICT` badge but rotated the other way, naming the
winner (`🥇 <name> WINS`, or `🤝 DRAW`). The two badges share one
`flex justify-between` row.

**The redundant one-liner goes.** The body's `winnerLabel` paragraph
("GPT-5.5 takes it") is now duplicated by the corner badge and is removed.
Explicitly retained, untouched: `💥 Winning argument`, the
`⚖️ Why this verdict` reasoning block, and the score bar.

**Judge tabs.** `session.pastVerdicts` already accumulates superseded verdicts
(the re-judge flow pushes them) and is already persisted — nothing rendered
them, so a user could not get back to an earlier judge's verdict. A tab row
above the verdict body lists every verdict by judge name, latest last and
selected by default; picking one swaps the entire body, footer judge badge, and
share payload. The row only appears once there is more than one verdict.

**Copy removals** (owner: all three are noise):

- `result.rejudge.billingNote` — "Runs one fresh judge turn — it costs the
  judge's coin price (minimum 1 coin). The previous verdict stays on record."
- `result.rejudge.secondOpinionBody` — "Hand the same transcript to a different
  judge for a fresh verdict."
- `community.publish.privacyNote` — "Whatever you hide is stripped before
  upload — it never leaves your match."

**`✓ Saved to your profile`** is removed from `MatchSaver`. The auto-save itself
stays; only the success line is dropped (the saving/retry/sign-in states remain,
since those carry information the user can act on).

## Execution

Two waves, so no two agents touch the same file:

- **Wave 1** (parallel): pricing copy · help removal · verdict card + copy removals
- **Wave 2**: daily claim (needs `pricing/page.tsx`, `coins.ts` and
  `GameShell.tsx` settled by wave 1)

`npx tsc --noEmit` and `npm test` gate each wave.
