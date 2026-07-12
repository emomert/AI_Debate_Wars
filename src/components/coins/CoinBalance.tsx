"use client";

/**
 * CoinBalance — the header coin chip (docs/23_COINS.md). Shows the signed-in
 * user's spendable total (purchased + today's remaining free coins) and links
 * to /pricing. Refreshes on auth changes, window focus, and the
 * COINS_CHANGED_EVENT broadcast. Renders nothing signed-out or while loading
 * (the parent only mounts it when COINS_ENABLED).
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { COINS_CHANGED_EVENT, fetchCoinStatus, type CoinStatus } from "@/lib/coins/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LocaleProvider";

export function CoinBalance() {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<CoinStatus | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !userId) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      void fetchCoinStatus(supabase).then((s) => {
        if (!cancelled && s) setStatus(s);
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(COINS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.removeEventListener(COINS_CHANGED_EVENT, refresh);
    };
  }, [supabase, userId]);

  if (!supabase || !userId || !status) return null;

  const total = status.purchased + status.dailyRemaining;
  return (
    <Link
      href="/pricing"
      aria-label={d.coins.balanceLabel}
      title={d.coins.balanceLabel}
      className="shrink-0 rounded-btn border-3 border-ink bg-arcade-yellow px-2 py-1 font-heading text-[11px] font-extrabold uppercase tracking-wide text-night transition hover:bg-arcade-orange focus-visible:outline-3 focus-visible:outline-offset-2 sm:text-xs"
    >
      {d.coins.balance(total)}
    </Link>
  );
}
