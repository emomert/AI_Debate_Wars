/**
 * Coin economy flags + free-tier constants (spec:
 * docs/superpowers/specs/2026-07-12-coin-economy-design.md).
 *
 * COINS_ENABLED defaults ON (owner decision 2026-07-12: launch the coin
 * economy before checkout — coins are distributed via promo codes and
 * scripts/mint-coins.mjs until Polar lands; pack buys stay "coming soon").
 * Kill switch: set NEXT_PUBLIC_COINS_ENABLED=false and redeploy (NEXT_PUBLIC_
 * because both the UI and the turn-route charge read it; Next.js inlines the
 * value at BUILD time). While off: matches are free-for-all, no sign-in gate.
 */

export const COINS_ENABLED = process.env.NEXT_PUBLIC_COINS_ENABLED !== "false";

/** Daily free allowance for signed-in users. NON-ROLLOVER by design: the
 *  remaining amount is computed as (allowance − today's daily-bucket spend),
 *  so unused coins simply cease to matter at midnight UTC — nothing to expire. */
export const FREE_DAILY_COINS = 15;

/** Daily coins only work on fighters up to this band; pricier fighters
 *  (8/12/20) charge the purchased/promo balance only. */
export const FREE_MAX_FIGHTER_COINS = 4;
