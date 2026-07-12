/**
 * Coin economy flags + free-tier constants (spec:
 * docs/superpowers/specs/2026-07-12-coin-economy-design.md).
 *
 * COINS_ENABLED follows the repo's feature-flag pattern (BLITZ_ENABLED,
 * VOICE_ENABLED…): everything ships dark and the flag flips after the owner
 * has tested the full loop (signup → daily coins → match charge → promo).
 * While false: matches stay free-for-all exactly as today.
 */

export const COINS_ENABLED = false;

/** Daily free allowance for signed-in users. NON-ROLLOVER by design: the
 *  remaining amount is computed as (allowance − today's daily-bucket spend),
 *  so unused coins simply cease to matter at midnight UTC — nothing to expire. */
export const FREE_DAILY_COINS = 15;

/** Daily coins only work on fighters up to this band; pricier fighters
 *  (8/12/20) charge the purchased/promo balance only. */
export const FREE_MAX_FIGHTER_COINS = 4;
