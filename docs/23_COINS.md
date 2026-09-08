# 23 — Coin Economy

> **September 8 update:** 13 verified model additions have explicit coin prices. Billable fighter bands now account for the least-revenue pack, hidden reasoning, retries, Deep Debate search, longer output, and the included Auto verdict: 4 / 8 / 12 / 40 / 80 / 160 coins. GPT-5/GPT-6 variants are priced with hidden reasoning included. The live daily-claim schema is present; earlier “0014 pending” notes are stale. Payment implementation is complete but activation depends on environment and verified operations.
>
> **Billing note:** the economic checks are conservative planning invariants, not a guaranteed profit statement or an upper bound on provider invoices. Match ownership, persisted quotes, generation replay protection, and provider spend reservations are enforced separately; see [the audit](26_PROJECT_AUDIT_2026-09-08.md) for boundaries.

> LIVE since 2026-07-12 (owner decision: launch before checkout — coins are
> distributed via promo codes + `scripts/mint-coins.mjs` until Polar lands).
> `COINS_ENABLED` (`src/lib/coins/config.ts`) defaults ON; the kill switch is
> `NEXT_PUBLIC_COINS_ENABLED=false` + redeploy (build-time inlined).
> Payment checkout (Polar) is BUILT (2026-07-17) and ships dark behind
> `NEXT_PUBLIC_PAYMENTS_ENABLED` — see "Polar checkout" below and the operator
> walkthrough `docs/24_PAYMENTS_POLAR_WALKTHROUGH.html`.

## The user-facing rule

A match costs **fighter A + fighter B coins**, plus a 4-coin allocation for the
included Auto verdict. Deep Debate adds **20 coins flat**. That metered add-on
uses purchased or promo coins, including when both fighters are in the free
band. (The old
"long length ×2" multiplier survives in `economy.ts` for legacy sessions, but
the UI is strictly short-length since July 2026, so new matches never hit it.) The judge is priced **separately, at the
verdict route** (decoupled from the match charge 2026-07-13 — see below): the
**Auto judge has no additional verdict charge**; a PICKED third-model judge adds
its coin price (flat). Judge charges are keyed on **(session, judge, transcript)**,
so switching to a *different* judge costs that judge's price while re-running the
**same** judge (or Auto) is idempotent/free. Multi-battle: each battle is priced
and charged separately.

> **Why decoupled (2026-07-13 security fix).** The judge used to be folded into
> the match charge, and re-judges were gated on a client-supplied "verdict
> ordinal" — which a crafted client could pin to 0 to run premium judges free.
> Pricing the judge from the RESOLVED judge at the verdict route, keyed on the
> transcript, removes that trust entirely. Trade-off: re-running the *same* judge
> no longer costs (it's the identical verdict); only *switching* judges does.

## Coin prices

Explicit per-model map in `src/lib/coins/economy.ts` (`MODEL_COINS`) uses
billable bands 4 / 8 / 12 / 40 / 80 / 160 per fighter. The source editorial
bands remain in the file so each model's uplift is auditable. The 4-coin band
is the free-tier ceiling; GPT-5/GPT-6 reasoning variants and the most expensive
models occupy the higher bands.
`economy.test.ts` enforces two invariants on every run:

- every catalog model has an **explicit** coin price (an own-property check now rejects fallback-only entries);
- every model clears a conservative **≥5× planning comparison** at the lowest
  net pack value, including short/medium/long fighter output;
- every deep/long catalog pairing clears the same floor after the included Auto
  judge allocation, search fees, retry allowance, and operating overhead;
- every selectable third-model judge clears the floor against its verdict cost.

When adding a model: registry + pricing + `MODEL_COINS`, or the tests fail.

The 700-coin pack is the least-revenue case. With the documented processor
allowance of 10% plus $0.30 per order, its net is $17.691, or **$0.0252729 per
coin**. The estimates apply a 20% retry allowance and 10% operating overhead
(a 1.32 multiplier), use uncached input or the higher published cache-write
rate, and include these planning profiles:

- Fighter: 2,680 input tokens and 900 visible output tokens across three short
  rounds; medium uses 1,500 output tokens and legacy long uses 2,400.
- Reasoning: 3,000 hidden tokens for every GPT-5/GPT-6 variant plus tagged or
  measured default-thinking models.
- Deep Debate: 5,200 input tokens, 4,500 visible output tokens, and three
  $0.005 searches per fighter.
- Judge: 6,500 input / 700 output tokens for a normal transcript, or 12,000
  input tokens for a deep transcript, with the same hidden-reasoning rule.

These are conservative planning assumptions, not a profit guarantee and not a
claim that the provider ledger bounds the final invoice. The checked-in GitHub
Actions workflow runs economy tests alongside lint, TypeScript and build.

For scale, the estimator puts one DeepSeek V4 Flash fighter at about $0.0084
for a short match, $0.0110 for legacy long output, and $0.0359 for Deep Debate.
GPT-6 Astra is about $0.3016 for a short match and $0.6006 for Deep Debate;
its 160-coin fighter price is deliberately much higher because its published
output rate is $50/M tokens and it carries hidden reasoning. A conservative
Deep Debate match pairing DeepSeek V4 Flash with Haiku 4.5 (legacy long
profile) is about $0.1325 including the Auto judge, six search calls, retries,
and overhead; the corresponding charge is 40 coins (16 fighter coins × 2,
plus 4 Auto allocation and 20 Deep Debate coins).

## Free tier & packs

- Signed-in users get **15 coins/day** (`FREE_DAILY_COINS`), computed as
  allowance − today's daily-bucket spend → **no rollover by construction**.
- **Claim-gated since 2026-07-28 (migration 0014).** The allowance used to be
  implicit — `coin_status()` reported `daily_spent`, and everyone derived
  `available = 15 − daily_spent`, so a user who never opened the app still had
  15 coins silently waiting. Now a `ClaimDailyButton` ("🎁 Claim 15 free
  coins" — mounted in the header next to the coin balance chip, and inside the
  free-tier card on `/pricing`) calls the `coin_claim_daily()` RPC, which
  inserts a row into `coin_daily_claims (user_id, claim_date)` for today
  (UTC). `coin_status()` now also returns `claimed_today`, and both the client
  (`dailyRemaining` in `src/lib/coins/client.ts`) and `coin_spend_match` gate
  the allowance on that flag: **unclaimed → 0 daily coins available**, no
  matter how much of the 15 is unspent. Skip a day and that day's coins are
  simply never available — there is no catch-up.
  - **The allowance stays COMPUTED, never CREDITED.** Claiming does not touch
    `coin_ledger` — it only records that today was claimed, and the existing
    `15 − daily_spent` computation is gated on that row's existence. A
    replayed, forged, or spammed claim call therefore cannot mint anything;
    the worst case is a no-op `insert … on conflict do nothing`.
    `primary key (user_id, claim_date)` makes double-claiming structurally
    impossible, and `coin_claim_daily()` is additionally guarded by the same
    `rl_hit` brute-force limiter `coin_redeem_promo` uses.
- Daily coins cover fighters **up to 4 coins** (`FREE_MAX_FIGHTER_COINS`);
  fighters above 4 coins (purple ★ chip) need purchased/promo coins. The
  included Auto allocation is daily-eligible; Deep Debate's 20-coin metered
  add-on is purchased/promo funded.
- Packs (owner-set): **100/$4.99 · 250/$9.99 · 700/$19.99** — `/pricing` buy
  buttons go to `/api/checkout?pack=N` when `NEXT_PUBLIC_PAYMENTS_ENABLED=true`
  (signed-out → the START signup gate); otherwise the disabled "coming soon"
  buttons render.
- Signed-out: everything browsable; START routes to `/login?next=/setup`.

## Data & enforcement (migrations 0012 + 0013 + 0014)

- `coin_ledger` — append-only; buckets `purchased` / `promo` / `daily`;
  own-rows SELECT RLS; writes only via SECURITY DEFINER RPCs keyed on
  `auth.uid()`. Purchase credits (webhook, next step) insert with a UNIQUE
  `order_id` via the service role.
- `coin_status()` → purchased balance + today's daily spend.
- `coin_spend_match(session, total, premium, allowance)` — advisory-locked,
  idempotent per (user, charge-key), splits daily-first, premium part
  purchased-only. Called by the turn route on EVERY turn (`ensureMatchCharged`)
  and the verdict route for a picked judge (`ensureJudgeCharged`),
  `src/lib/coins/server.ts`. Fails CLOSED when the ledger is unreachable.
- **Charge keys are HMAC-signed (2026-07-13, `src/lib/coins/chargeKey.ts`).**
  `coin_spend_match` is reachable over PostgREST, so the key is bound to an HMAC
  over (session id, amount, match/transcript content) with a server-only secret
  (`SUPABASE_SERVICE_ROLE_KEY`, or `COIN_CHARGE_SECRET`). A hostile client can't
  forge a real match's key to pre-seed a free "ALREADY", nor replay one paid key
  across *different* matches. Coins therefore now require the service-role key;
  the charge fails closed without it.
- **Migration 0013** additionally makes the DB ignore a client-supplied
  `p_allowance` (the 15/day free cap is a server constant), so the free daily
  bucket can't be inflated even by a direct RPC call.
- `coin_redeem_promo(code)` — normalized codes, expiry, global cap
  (row-locked), one-per-account PK, **10 attempts/hour/user inside the DB**
  (reuses `rl_hit`), atomic credit.
- New error code `OUT_OF_COINS` (402) with en/tr arena copy.
- `coin_daily_claims (user_id, claim_date)` — own-rows SELECT RLS, no write
  policy (definer-only). `coin_claim_daily()` inserts `on conflict do nothing`
  and returns `CLAIMED` on the first claim of the day, `ALREADY` on a repeat,
  `AUTH` signed-out, `RATE_LIMITED` past 60 attempts/hour/user. It NEVER
  writes to `coin_ledger` — see "Free tier & packs" above.

## Promo codes (marketing)

Mint: `node scripts/create-promo.mjs --coins 50 --max 100 [--days 30]
[--code LAUNCH-XYZ]` (generated codes are high-entropy). List: `--list`.
`/admin` shows a read-only table (code, grants, redeemed/max, expiry, status).
Users redeem on `/pricing` (signed-in). Promo coins land in the `promo`
bucket = spendable on any fighter, never expire.

## UI map

- Header: `CoinBalance` chip (purchased + daily remaining → links `/pricing`),
  refreshes on focus/auth/`ada:coins-changed`, and drops OPTIMISTICALLY on
  `ada:coins-spent` (2026-07-28). Before that the chip only re-read the balance
  when the first turn RESPONDED, so a match's charge — applied server-side
  before any model work — appeared ~18s late; it now shows within ~1.6s of
  START (the rest is the /debate page transition). `debateClient.generateTurn`
  fires the spend on the first turn of each battle (`messages.length === 0`,
  the request that triggers `ensureMatchCharged`) and re-reads on success;
  `generateVerdict` re-reads too, since a picked judge is charged there.
  The chip keeps a spend counter so an in-flight read cannot wipe a newer
  optimistic drop — starting a match remounts the chip, and that mount's fetch
  (issued pre-charge) otherwise resolved late and restored the old number.
- Picker rows: coin chip replaces the $-tier badge; purple ★ = premium.
- Match Card: a dedicated "Total cost — 🪙 N coins" row (across battles, judge
  included) at the bottom of the card; replaced the easy-to-miss badge chip
  (owner 7/16).
- `/pricing`: free-tier explainer + `ClaimDailyButton` (`variant="panel"`),
  packs, rules, promo redemption. Footer link (flag-gated).
- `ClaimDailyButton` (`src/components/coins/ClaimDailyButton.tsx`): renders
  nothing signed-out, coins-off, or once today is already claimed. `chip`
  variant sits in the header next to `CoinBalance`; `panel` variant is the
  full-width button in the `/pricing` free-tier card. Re-checks claim state on
  focus and `ada:coins-changed` (mirrors `CoinBalance`), so a tab left open
  past midnight UTC shows the button again.
- `PricingPopup`: once-per-device tier intro for signed-in users on setup.

## Operator tools

- Mint coins: `node scripts/mint-coins.mjs --user <uuid|email> --coins 500
  [--note "reason"]` (negative claws back; `--balance` to just look).
- Promo codes: `node scripts/create-promo.mjs --coins 25 --max 100 [--days 30]
  [--prefix LAUNCH]`; `--list` shows all; /admin has the redemption table.
- The full RPC loop (daily charge, idempotency, premium block, purchased
  split, promo normalize + re-redeem block) was verified against the live DB
  on 2026-07-12 in a rolled-back transaction.

## Polar checkout (built 2026-07-17, dark until env + flag are set)

- `GET /api/checkout?pack=100|250|700` — rate-limited (`checkout` kind,
  `RL_CHECKOUT_PER_MIN`), auth-required, resolves the pack → Polar product id
  SERVER-side (`POLAR_PRODUCT_*` env; the client never names products or
  amounts), attaches the Supabase user as Polar's `externalCustomerId`, and
  redirects to the checkout. Failures bounce back to
  `/pricing?checkout=error|unavailable` (the page toasts them).
- `POST /api/webhooks/polar` — the ONLY place purchased coins are created.
  Signature-verified by `@polar-sh/nextjs` before the handler runs; on
  `order.paid` inserts the `coin_ledger` credit (bucket `purchased`, reason
  `order`) via the service role. Idempotent on the UNIQUE `order_id` index
  (23505 = redelivery = success). Unfixable payloads log to the /admin error
  panel and return 200 (no retry storm); infrastructure failures 500 so Polar
  redelivers.
- Env: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`
  (`sandbox`|`production`), `POLAR_PRODUCT_100/250/700`, plus the build-time
  UI flag `NEXT_PUBLIC_PAYMENTS_ENABLED`. Setup + test + go-live steps:
  `docs/24_PAYMENTS_POLAR_WALKTHROUGH.html`.
- Refunds are manual for v1: refund in the Polar dashboard, then claw back via
  `scripts/mint-coins.mjs --coins -N --note "refund order <id>"`.
