/**
 * Coin economy flags + free-tier constants (spec:
 * docs/superpowers/specs/2026-07-12-coin-economy-design.md).
 *
 * COINS_ENABLED defaults ON (owner decision 2026-07-12: launch the coin
 * economy before checkout — coins are distributed via promo codes and
 * scripts/mint-coins.mjs until Polar lands; pack buys stay "coming soon").
 * Kill switch: set NEXT_PUBLIC_COINS_ENABLED=false and redeploy (NEXT_PUBLIC_
 * because both the UI and the turn-route charge read it; Next.js inlines the
 * value at BUILD time). While off: no coin charges. Production generation still
 * requires a signed-in owner; only local development may run anonymously.
 */

export const COINS_ENABLED = process.env.NEXT_PUBLIC_COINS_ENABLED !== "false";
export const MATCH_AUTH_REQUIRED = COINS_ENABLED || process.env.NODE_ENV === "production";

/**
 * Pack purchases (Polar checkout — docs/24_PAYMENTS_POLAR_WALKTHROUGH.html).
 * OFF by default so the code can ship before the Polar env exists; set
 * NEXT_PUBLIC_PAYMENTS_ENABLED=true (build-time inlined → needs a redeploy)
 * once products, the access token, and the webhook are configured. While off,
 * /pricing keeps the disabled "coming soon" buy buttons.
 */
export const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

/** Daily free allowance for signed-in users. NON-ROLLOVER by design: the
 *  remaining amount is computed as (allowance − today's daily-bucket spend),
 *  so unused coins simply cease to matter at midnight UTC — nothing to expire. */
export const FREE_DAILY_COINS = 15;

/** Daily coins only work on fighters up to this band; pricier fighters charge
 * the purchased/promo balance only. Deep Debate's metered add-on is also
 * purchased/promo funded, even when both fighters are in this band. */
export const FREE_MAX_FIGHTER_COINS = 4;
