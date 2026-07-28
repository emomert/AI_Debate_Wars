"use client";

/**
 * /pricing — coins & packs (docs/23_COINS.md). Pack buys go through Polar
 * (docs/24_PAYMENTS_POLAR_WALKTHROUGH.html): the buy buttons link to
 * /api/checkout?pack=N when PAYMENTS_ENABLED (signed-out gets the signup gate,
 * matching START), and /api/checkout redirects back here with a ?checkout=
 * status this page toasts. While PAYMENTS_ENABLED is off the packs render the
 * old disabled "coming soon" buttons. Promo redemption calls the
 * coin_redeem_promo RPC directly (SECURITY DEFINER — per-account uniqueness,
 * expiry, caps and attempt limits enforced in the DB).
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";
import { COIN_PACKS } from "@/lib/coins/economy";
import { FREE_DAILY_COINS, FREE_MAX_FIGHTER_COINS, PAYMENTS_ENABLED } from "@/lib/coins/config";
import { COINS_CHANGED_EVENT } from "@/lib/coins/client";
import { PromoRedeem } from "@/components/coins/PromoRedeem";
import { ClaimDailyButton } from "@/components/coins/ClaimDailyButton";
import { SignupGateModal } from "@/components/coins/SignupGateModal";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function PricingPage() {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const [signedIn, setSignedIn] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<
    "success" | "error" | "unavailable" | null
  >(null);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(Boolean(s?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // /api/checkout redirects back here with ?checkout=success|error|unavailable.
  // On success the coins land via webhook, which can trail the redirect by a
  // few seconds — poke the balance chip now and again shortly after.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("checkout");
    if (status !== "success" && status !== "error" && status !== "unavailable") return;
    setCheckoutStatus(status);
    window.history.replaceState(null, "", "/pricing"); // don't re-toast on refresh
    if (status === "success") {
      window.dispatchEvent(new Event(COINS_CHANGED_EVENT));
      const late = setTimeout(
        () => window.dispatchEvent(new Event(COINS_CHANGED_EVENT)),
        4000,
      );
      return () => clearTimeout(late);
    }
  }, []);

  return (
    <GameShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          {d.coins.pricing.title}
        </h1>

        {checkoutStatus ? (
          <div
            role="status"
            className={`mt-4 rounded-card border-3 border-ink p-3 text-sm font-bold ${
              checkoutStatus === "success" ? "bg-arcade-green/20" : "bg-arcade-red/15"
            }`}
          >
            {checkoutStatus === "success"
              ? d.coins.pricing.checkoutSuccess
              : checkoutStatus === "error"
                ? d.coins.pricing.checkoutError
                : d.coins.pricing.checkoutUnavailable}
          </div>
        ) : null}

        {/* Free tier */}
        <GamePanel className="mt-6">
          <p className="font-heading text-lg font-extrabold">{d.coins.pricing.freeTitle}</p>
          <p className="mt-1 text-sm text-ink/70">
            {d.coins.pricing.freeBody(FREE_DAILY_COINS, FREE_MAX_FIGHTER_COINS)}
          </p>
          <ClaimDailyButton variant="panel" />
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
              <div className="mt-auto pt-4">
                {PAYMENTS_ENABLED ? (
                  <ArcadeButton
                    variant="primary-green"
                    fullWidth
                    onClick={() => {
                      // Signed-out: warn, don't yank to login (owner 7/12 rule,
                      // same gate START uses). Signed-in: the checkout route
                      // resolves the product server-side from the pack name.
                      if (!signedIn) {
                        setGateOpen(true);
                        return;
                      }
                      window.location.assign(`/api/checkout?pack=${p.coins}`);
                    }}
                  >
                    {d.coins.pricing.buy}
                  </ArcadeButton>
                ) : (
                  <ArcadeButton variant="primary-green" fullWidth disabled>
                    {d.coins.pricing.comingSoon}
                  </ArcadeButton>
                )}
              </div>
            </GamePanel>
          ))}
        </div>
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

      <SignupGateModal open={gateOpen} onClose={() => setGateOpen(false)} />
    </GameShell>
  );
}
