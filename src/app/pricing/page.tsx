"use client";

/**
 * /pricing — coins & packs (docs/23_COINS.md). Ships BEFORE payment wiring:
 * the three owner-set packs render with disabled "coming soon" buy buttons
 * (Polar checkout is the next step), while the free-tier explainer, the
 * how-coins-work rules and PROMO CODE redemption are fully live. Promo
 * redemption calls the coin_redeem_promo RPC directly (SECURITY DEFINER —
 * per-account uniqueness, expiry, caps and attempt limits enforced in the DB).
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import { COIN_PACKS } from "@/lib/coins/economy";
import { FREE_DAILY_COINS, FREE_MAX_FIGHTER_COINS } from "@/lib/coins/config";
import { PromoRedeem } from "@/components/coins/PromoRedeem";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LocaleProvider";

// Example match prices the pack cards translate into "what that buys".
const QUICK_MATCH_COINS = 2; // two 1-coin fighters
const PREMIUM_BOUT_COINS = 6; // e.g. Sonnet 5 (4) + Kimi (2)
const FLAGSHIP_FIGHT_COINS = 13; // e.g. GPT-5.5 (12) + a 1-coin sparring partner

export default function PricingPage() {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(Boolean(s?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  return (
    <GameShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          {d.coins.pricing.title}
        </h1>
        <p className="mt-1 max-w-2xl text-ink/65">{d.coins.pricing.subtitle}</p>

        {/* Free tier */}
        <GamePanel className="mt-6">
          <p className="font-heading text-lg font-extrabold">{d.coins.pricing.freeTitle}</p>
          <p className="mt-1 text-sm text-ink/70">
            {d.coins.pricing.freeBody(FREE_DAILY_COINS, FREE_MAX_FIGHTER_COINS)}
          </p>
        </GamePanel>

        {/* Packs */}
        <h2 className="mt-8 mb-3 font-heading text-xl font-extrabold">
          {d.coins.pricing.packsTitle}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {COIN_PACKS.map((p, i) => (
            <GamePanel key={p.usd} padding="md" className="relative flex flex-col">
              {i === 1 ? (
                <Badge color="purple" size="sm" className="absolute -top-3 left-4">
                  {d.coins.pricing.popular}
                </Badge>
              ) : null}
              {i === 2 ? (
                <Badge color="green" size="sm" className="absolute -top-3 left-4">
                  {d.coins.pricing.bestValue}
                </Badge>
              ) : null}
              <p className="font-display text-3xl tracking-tight">
                {d.coins.pricing.packHeading(p.coins)}
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold">${p.usd.toFixed(2)}</p>
              <p className="text-xs text-ink/50">
                {d.coins.pricing.perCoin(((p.usd / p.coins) * 100).toFixed(1))}
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink/50">
                {d.coins.pricing.examplesIntro}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-ink/70">
                <li>{d.coins.pricing.exampleQuick(Math.floor(p.coins / QUICK_MATCH_COINS))}</li>
                <li>{d.coins.pricing.examplePremium(Math.floor(p.coins / PREMIUM_BOUT_COINS))}</li>
                <li>{d.coins.pricing.exampleFlagship(Math.floor(p.coins / FLAGSHIP_FIGHT_COINS))}</li>
              </ul>
              <div className="mt-auto pt-4">
                <ArcadeButton variant="primary-green" fullWidth disabled>
                  {d.coins.pricing.comingSoon}
                </ArcadeButton>
              </div>
            </GamePanel>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-ink/50">{d.coins.pricing.notifyNote}</p>

        {/* Rules */}
        <GamePanel className="mt-8">
          <p className="font-heading text-lg font-extrabold">{d.coins.pricing.rulesTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">
            {d.coins.pricing.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </GamePanel>

        {/* Promo redemption */}
        <GamePanel className="mt-6">
          <p className="font-heading text-lg font-extrabold">{d.coins.pricing.promoTitle}</p>
          {!supabase || !signedIn ? (
            <p className="mt-2 text-sm text-ink/60">
              <Link
                href="/login?next=/pricing"
                className="font-bold underline decoration-2 underline-offset-2"
              >
                {d.coins.pricing.promoSignIn}
              </Link>
            </p>
          ) : (
            <div className="mt-3">
              <PromoRedeem />
            </div>
          )}
        </GamePanel>
      </div>
    </GameShell>
  );
}
