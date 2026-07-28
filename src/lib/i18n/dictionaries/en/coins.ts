/** Coin economy UI (docs/23_COINS.md) — header balance, model-row chips,
 *  /pricing page, post-signup popup, promo redemption. */
export const coins = {
  // Header balance chip (links to /pricing)
  balance: (n: number) => `🪙 ${n}`,
  balanceLabel: "Your coin balance — see packs & pricing",

  // Model rows / match card
  coinChip: (n: number) => `🪙 ${n}`,
  premiumTag: "★",
  premiumHint: "Premium fighter — uses purchased coins",
  // Match Card dedicated total row (owner 7/16 — the old chip was easy to miss)
  totalCostLabel: "Total cost",
  totalCostValue: (n: number) => `🪙 ${n} ${n === 1 ? "coin" : "coins"}`,

  // Signed-out START gate (warning modal — owner 7/12: warn, don't redirect)
  gate: {
    title: "Sign up first",
    body: (daily: number) =>
      `Matches need an account — signing up takes seconds and comes with ${daily} free coins every day.`,
    cta: "Sign up free",
    later: "Not now",
  },

  /** ClaimDailyButton (docs/23_COINS.md; migration 0014) — the daily allowance
   *  is claim-gated: it stays computed, never credited, but you must press
   *  claim each day or that day's coins are simply never available. */
  claim: {
    cta: (n: number) => `🎁 Claim ${n} free coins`,
    chipCta: (n: number) => `🎁 Claim ${n}`,
    busy: "Claiming…",
    claimed: "✅ Claimed! Come back tomorrow for more free coins.",
    claimedShort: "✅ Claimed",
    error: "Couldn't claim right now — try again in a moment.",
    errorShort: "Retry claim",
    rateLimited: "Too many attempts — try again in an hour.",
    rateLimitedShort: "Try later",
  },

  pricing: {
    title: "Coins & Pricing",
    freeTitle: "🎁 Free, every single day",
    freeBody: (daily: number, maxBand: number) =>
      `Signed-in players can claim ${daily} coins a day, free — press the claim button each day to collect them (skip a day and that day's coins are simply gone, no rollover). Claimed coins work on every fighter priced up to ${maxBand} coins — that covers most of the roster.`,
    packsTitle: "Coin packs",
    // "What that buys" — tiers only, NO model names (owner 7/28: naming
    // specific fighters dates the copy every time the catalog moves).
    examplesIntro: "What that buys:",
    exampleQuick: (n: number) => `≈ ${n} regular matches (2 coins)`,
    examplePremium: (n: number) => `≈ ${n} premium bouts (6 coins)`,
    exampleFlagship: (n: number) => `≈ ${n} frontier fights (13 coins)`,
    comingSoon: "Payments launching soon",
    buy: "Buy now",
    // ?checkout= status banners (set by /api/checkout redirects)
    checkoutSuccess:
      "Payment received! Your coins are on the way — the balance updates within a few seconds.",
    checkoutError: "Checkout didn't complete and you weren't charged. Please try again.",
    checkoutUnavailable: "Payments aren't available right now — please try again shortly.",
    popular: "Most popular",
    bestValue: "Best value",
    perCoin: (cents: string) => `${cents}¢ / coin`,
    packHeading: (coins: number) => `${coins} coins`,
    rulesTitle: "How coins work",
    rules: [
      "A match costs fighter A + fighter B coins — the price is on every fighter card.",
      "Deep Debate adds 2 coins flat.",
      "The Auto judge is included free. Picking your own judge adds that model's coin price.",
      "Switching to a different judge costs that judge's coin price; re-running the same judge (or the Auto judge) is free.",
      "Premium fighters (8 coins and up) use purchased or promo coins — daily free coins cover everything up to 4 coins.",
      "Purchased and promo coins never expire.",
    ],
    promoTitle: "Have a promo code?",
    promoPlaceholder: "e.g. LAUNCH-XXXXX",
    promoCta: "Redeem",
    promoRedeeming: "Redeeming…",
    promoSignIn: "Sign in to redeem a promo code.",
    promoSuccess: (n: number) => `+${n} coins added to your balance! 🎉`,
    promoErrors: {
      INVALID: "That code doesn't exist — check the spelling.",
      EXPIRED: "That code has expired.",
      EXHAUSTED: "That code has been fully redeemed.",
      ALREADY_USED: "You've already used this code.",
      RATE_LIMITED: "Too many attempts — try again in an hour.",
      AUTH: "Sign in first, then redeem.",
      UNKNOWN: "Couldn't redeem right now — try again in a moment.",
    },
  },

  /** The optional promo question on /welcome (right after signup). */
  welcomePromo: {
    title: "🎟️ Got a promo code?",
    body: "Type it now and the coins land straight in your balance — or redeem later on the Pricing page.",
  },

};
