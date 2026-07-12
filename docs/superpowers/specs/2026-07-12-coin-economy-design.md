# 2026-07-12 Coin economy + catalog expansion — design

Owner-approved (report review + interactive Q&A). Source analysis:
`Debator-Monetization-Report.html` (untracked, repo root). Payments (Polar
checkout) are explicitly the NEXT step — this build ships everything up to the
purchase button.

## Locked decisions

- **Currency:** coins. 1 coin ≈ $0.05 retail. Match price = fighter A coins +
  fighter B coins. Long length ×2 (total), Deep Debate +2 flat. Judge free;
  re-judge free (existing cap). Multi-battle: each battle priced and charged
  separately (per battle session).
- **Coin bands (per fighter per match)** derived from real per-match API cost
  (2,680 in + 900 out + 2,400 thinking tokens for reasoning models, short/3
  rounds): 1 (≤$0.0065) · 2 (≤$0.02) · 4 (≤$0.04) · 8 (≤$0.08) · 12 (≤$0.12) ·
  20 (>). Every band ≥5.0× worst-case margin at 5¢/coin. Explicit per-model map
  in code with a test enforcing coverage + margins against `pricing.ts`.
- **Sign-up required to run matches.** Signed-out users browse everything
  (home, demo, community, setup); pressing START opens a signup prompt.
- **Free tier:** 15 coins/day, granted on demand, **no rollover** (computed as
  daily allowance minus today's daily-bucket spend — nothing to expire).
  Daily coins only cover fighters **up to the 4-coin band**; Elite/Flagship/
  Boss fighters (8/12/20) charge the purchased/promo balance only. No separate
  signup grant (day-1 allowance serves).
- **Packs (owner-set):** 100 coins/$4.99 · 250/$9.99 · 700/$19.99. Store UI
  ships NOW with disabled "coming soon" buy buttons; Polar wiring is next.
  Pricing page + post-signup popup show per-pack match examples (quick match
  2 coins, premium bout ~6, flagship fight ~13).
- **Promo codes:** operator script mints codes (code, coins, expiry, max
  redemptions); /admin shows a read-only redemption table. Guardrails: one
  redemption per account per code (DB unique), expiry, global cap, atomic
  credit, rate-limited attempts, normalized codes, no enumeration. Promo coins
  land in the purchased-equivalent bucket (spendable on any fighter).
- **Catalog:** add 13 OpenRouter models (all verified on the live feed —
  no new API): Meta llama-4-maverick + llama-4-scout, Mistral
  mistral-medium-3-5 + mistral-small-2603, Amazon nova-pro-v1 + nova-lite-v1,
  Tencent hy3, Anthropic claude-haiku-4.5, Google gemma-4-26b-a4b-it,
  Moonshot kimi-k2.5, MiniMax minimax-m2.5, Z.AI glm-4.7-flash, NVIDIA
  nemotron-3-nano-30b-a3b. Four new brand tiles: Meta, Mistral, Amazon,
  Tencent (logo files self-hosted). REMOVE `gpt-5.2-chat-latest` and
  `gpt-5.3-chat-latest` now (published sunset Aug 10).

## Architecture

- `src/lib/coins/config.ts` — `COINS_ENABLED` flag (repo flag pattern; false
  until launch), `FREE_DAILY_COINS = 15`, `FREE_MAX_FIGHTER_COINS = 4`.
- `src/lib/coins/economy.ts` — band table, `coinPriceForModel(modelId)`
  (explicit map), `matchCoinCost(session|config)` (fighters + deep + long),
  `premiumShare(...)` (the part only purchased coins may pay), pack list.
  Tests: every catalog model priced; ≥5× margin vs pricing.ts; cost cases.
- **Migration 0009_coins.sql** — `coin_ledger` (user_id, delta, bucket
  purchased|promo|daily, reason, match_id UNIQUE-when-spend, order_id, ts;
  RLS own-select), `promo_codes`, `promo_redemptions` (UNIQUE code+user),
  SECURITY DEFINER RPCs granted to `authenticated`:
  `coin_status()` → {purchased_balance, daily_remaining},
  `spend_coins_for_match(session_id, total, premium_part)` — atomic,
  idempotent on session_id, splits daily-first for the non-premium part,
  `redeem_promo(code)` — all guardrails, returns granted coins.
- **Server gating** — turn route: when `COINS_ENABLED`, before provider work on
  the FIRST turn of a session: require auth user, compute cost server-side
  from the session (never trust client numbers), call
  `spend_coins_for_match`; 402-style error `INSUFFICIENT_COINS` (new AppError
  code) when it fails. Rate/spend caps stay in front as today.
- **UI** — coin chips on model rows (replace $ tier badge; ≥8-coin fighters get
  a "premium" marker), header balance chip (signed-in, live), Match Card total
  ("This match: N coins") + insufficient state, signed-out START → signup
  prompt, `/pricing` page (packs, free-tier explainer, match examples, promo
  code entry, disabled buy buttons), post-signup tier popup (once,
  localStorage-flagged, also reachable from the insufficient-coins path),
  promo entry also on /profile. i18n en+tr.
- **Admin/ops** — `scripts/create-promo.mjs` (node+pg, like admin-takedown),
  /admin: promo table + coins-granted/spent counters.
- **Docs** — `docs/23_COINS.md` + CLAUDE.md status/feature updates.

## Phases

A. Catalog: models + pricing + logos + coin map (+ tests, /report inherits).
B. Ledger: migration + RPCs + turn-route gating behind flag.
C. UI: badges → balance → gate → /pricing → popup → promo entry.
D. Ops/docs: promo script, /admin table, docs, checklist.

Ship each phase green (tsc + vitest + build), commit separately. The flag
stays off until the owner flips it after end-to-end testing.
