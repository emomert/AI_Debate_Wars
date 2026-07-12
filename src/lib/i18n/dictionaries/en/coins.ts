/** Coin economy UI (docs/23_COINS.md) — header balance, model-row chips,
 *  /pricing page, post-signup popup, promo redemption. */
export const coins = {
  // Header balance chip (links to /pricing)
  balance: (n: number) => `🪙 ${n}`,
  balanceLabel: "Your coin balance — see packs & pricing",
  dailySuffix: (n: number) => `+${n} today`,

  // Model rows / match card
  coinChip: (n: number) => `🪙 ${n}`,
  premiumTag: "★",
  premiumHint: "Premium fighter — uses purchased coins",
  matchCost: (n: number) => `🪙 This match: ${n} ${n === 1 ? "coin" : "coins"}`,

  // Signed-out START gate (warning modal — owner 7/12: warn, don't redirect)
  gate: {
    title: "Sign up first",
    body: (daily: number) =>
      `Matches need an account — signing up takes seconds and comes with ${daily} free coins every day.`,
    cta: "Sign up free",
    later: "Not now",
  },

  pricing: {
    title: "Coins & Pricing",
    subtitle: "Every fighter has a coin price. A match costs the two fighters added together — the judge is always free.",
    freeTitle: "🎁 Free, every single day",
    freeBody: (daily: number, maxBand: number) =>
      `Signed-in players get ${daily} coins a day, free. They work on every fighter priced up to ${maxBand} coins — that covers most of the roster. Unused daily coins don't roll over; they refresh at midnight UTC.`,
    packsTitle: "Coin packs",
    comingSoon: "Payments launching soon",
    notifyNote: "Packs are locked in — checkout goes live shortly.",
    popular: "Most popular",
    bestValue: "Best value",
    perCoin: (cents: string) => `${cents}¢ / coin`,
    packHeading: (coins: number) => `${coins} coins`,
    examplesIntro: "What that buys:",
    exampleQuick: (n: number) => `≈ ${n} quick matches (two 1-coin fighters)`,
    examplePremium: (n: number) => `≈ ${n} premium bouts (e.g. Sonnet 5 vs Kimi)`,
    exampleFlagship: (n: number) => `≈ ${n} flagship fights (e.g. GPT-5.5 on stage)`,
    rulesTitle: "How coins work",
    rules: [
      "A match costs fighter A + fighter B coins — the price is on every fighter card.",
      "Long response length doubles the fighter total; Deep Debate adds 2 coins flat.",
      "The judge (and re-judging) is always free.",
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

  popup: {
    title: "🪙 Coins power the arena",
    body: (daily: number) =>
      `You get ${daily} free coins every day — enough for several matches. Bigger fighters cost more coins; packs unlock the heavyweights.`,
    seePricing: "See coins & pricing",
    dismiss: "Let's fight ▶",
  },
};
