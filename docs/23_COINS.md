# 23 — Coin Economy

> LIVE since 2026-07-12 (owner decision: launch before checkout — coins are
> distributed via promo codes + `scripts/mint-coins.mjs` until Polar lands).
> `COINS_ENABLED` (`src/lib/coins/config.ts`) defaults ON; the kill switch is
> `NEXT_PUBLIC_COINS_ENABLED=false` + redeploy (build-time inlined).
> Design + analysis:
> `docs/superpowers/specs/2026-07-12-coin-economy-design.md` and the
> owner's `Debator-Monetization-Report.html` (untracked, repo root).
> Payment checkout (Polar) is the NEXT step — everything up to the buy
> button is built.

## The user-facing rule

A match costs **fighter A + fighter B coins**. Long response length ×2 (on the
fighter total), Deep Debate +2 flat. The **Auto judge is included free**; a
PICKED judge adds its coin price (flat — owner 7/12: a free Fable judge on a
2-coin match was cash-negative). **Re-judging is never free**: each re-judge
costs the judge's coin price, minimum 1 coin (charged in the verdict route,
idempotent per session+judge+ordinal). Multi-battle: each battle is priced and
charged separately.

## Coin prices

Explicit per-model map in `src/lib/coins/economy.ts` (`MODEL_COINS`), banded
1 / 2 / 4 / 8 / 12 / 20 per fighter from real per-match API cost.
`economy.test.ts` enforces two invariants on every run:

- every catalog model has a coin price;
- every model clears a **≥5× margin** at 5¢/coin retail against `pricing.ts`
  (usage profile: 2,680 in + 900 out + 2,400 thinking tokens for reasoning
  models — from real recorded matches).

When adding a model: registry + pricing + `MODEL_COINS`, or the tests fail.

## Free tier & packs

- Signed-in users get **15 coins/day** (`FREE_DAILY_COINS`), computed as
  allowance − today's daily-bucket spend → **no rollover by construction**.
- Daily coins cover fighters **up to 4 coins** (`FREE_MAX_FIGHTER_COINS`);
  premium fighters (8/12/20 — purple ★ chip) need purchased/promo coins.
- Packs (owner-set): **100/$4.99 · 250/$9.99 · 700/$19.99** — `/pricing`
  renders them with disabled "coming soon" buys until Polar is wired.
- Signed-out: everything browsable; START routes to `/login?next=/setup`.

## Data & enforcement (migration 0012)

- `coin_ledger` — append-only; buckets `purchased` / `promo` / `daily`;
  own-rows SELECT RLS; writes only via SECURITY DEFINER RPCs keyed on
  `auth.uid()`. Purchase credits (webhook, next step) insert with a UNIQUE
  `order_id` via the service role.
- `coin_status()` → purchased balance + today's daily spend.
- `coin_spend_match(session, total, premium, allowance)` — advisory-locked,
  idempotent per (user, charge-key), splits daily-first, premium part
  purchased-only. Called by the turn route on EVERY turn (`ensureMatchCharged`,
  `src/lib/coins/server.ts`) — the charge key embeds the total so mutating a
  paid session's config re-charges instead of riding free. Fails CLOSED when
  the ledger is unreachable.
- `coin_redeem_promo(code)` — normalized codes, expiry, global cap
  (row-locked), one-per-account PK, **10 attempts/hour/user inside the DB**
  (reuses `rl_hit`), atomic credit.
- New error code `OUT_OF_COINS` (402) with en/tr arena copy.

## Promo codes (marketing)

Mint: `node scripts/create-promo.mjs --coins 50 --max 100 [--days 30]
[--code LAUNCH-XYZ]` (generated codes are high-entropy). List: `--list`.
`/admin` shows a read-only table (code, grants, redeemed/max, expiry, status).
Users redeem on `/pricing` (signed-in). Promo coins land in the `promo`
bucket = spendable on any fighter, never expire.

## UI map

- Header: `CoinBalance` chip (purchased + daily remaining → links `/pricing`),
  refreshes on focus/auth/`ada:coins-changed`.
- Picker rows: coin chip replaces the $-tier badge; purple ★ = premium.
- Match Card: "This match: N coins" total across battles.
- `/pricing`: free-tier explainer, packs + match-count examples, rules,
  promo redemption. Footer link (flag-gated).
- `PricingPopup`: once-per-device tier intro for signed-in users on setup.

## Operator tools

- Mint coins: `node scripts/mint-coins.mjs --user <uuid|email> --coins 500
  [--note "reason"]` (negative claws back; `--balance` to just look).
- Promo codes: `node scripts/create-promo.mjs --coins 25 --max 100 [--days 30]
  [--prefix LAUNCH]`; `--list` shows all; /admin has the redemption table.
- The full RPC loop (daily charge, idempotency, premium block, purchased
  split, promo normalize + re-redeem block) was verified against the live DB
  on 2026-07-12 in a rolled-back transaction.

## Remaining: Polar checkout

Wire checkout per pack + webhook (`order.paid` → `coin_ledger` credit via
service role, idempotent on the UNIQUE `order_id` index) and replace the
disabled "coming soon" buttons on /pricing.
