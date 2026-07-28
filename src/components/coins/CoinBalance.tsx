"use client";

/**
 * CoinBalance — the header coin chip (docs/23_COINS.md). Shows the signed-in
 * user's spendable total (purchased + today's remaining free coins) and links
 * to /pricing. Refreshes on auth changes, window focus, and the
 * COINS_CHANGED_EVENT broadcast. Renders nothing signed-out or while loading
 * (the parent only mounts it when COINS_ENABLED).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  COINS_CHANGED_EVENT,
  COINS_SPENT_EVENT,
  fetchCoinStatus,
  type CoinStatus,
} from "@/lib/coins/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LocaleProvider";

export function CoinBalance() {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<CoinStatus | null>(null);
  /**
   * Coins spent but not yet reflected by a `coin_status` read. A match is
   * charged server-side before any model work, but the client only re-reads the
   * balance when the first turn RESPONDS — seconds later — so without this the
   * chip sat on the old number for the whole first turn. Cleared by the next
   * successful fetch, which is authoritative.
   */
  const [pendingSpend, setPendingSpend] = useState(0);
  /**
   * Bumped on every spend. A fetch may only clear `pendingSpend` if no spend
   * landed while it was in flight — otherwise a stale read wipes a valid
   * optimistic drop. This is not hypothetical: starting a match navigates to
   * /debate, which REMOUNTS this chip, and that mount's fetch (issued before
   * the charge existed) used to resolve after the spend event and restore the
   * old balance, leaving the number stale until the first turn finished.
   */
  const spendSeq = useRef(0);

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
      const seqAtStart = spendSeq.current;
      void fetchCoinStatus(supabase).then((s) => {
        if (cancelled || !s) return;
        setStatus(s);
        // Only authoritative for spends this read could have seen.
        if (spendSeq.current === seqAtStart) setPendingSpend(0);
      });
    };
    const onSpend = (e: Event) => {
      const amount = (e as CustomEvent<{ amount: number }>).detail?.amount ?? 0;
      if (amount <= 0) return;
      spendSeq.current += 1;
      setPendingSpend((p) => p + amount);
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(COINS_CHANGED_EVENT, refresh);
    window.addEventListener(COINS_SPENT_EVENT, onSpend);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.removeEventListener(COINS_CHANGED_EVENT, refresh);
      window.removeEventListener(COINS_SPENT_EVENT, onSpend);
    };
  }, [supabase, userId]);

  if (!supabase || !userId || !status) return null;

  const total = Math.max(0, status.purchased + status.dailyRemaining - pendingSpend);
  return (
    <Link
      href="/pricing"
      aria-label={d.coins.balanceLabel}
      title={d.coins.balanceLabel}
      className="shrink-0 rounded-btn border-3 border-ink bg-arcade-yellow/30 px-2 py-1 font-heading text-[11px] font-extrabold uppercase tracking-wide text-ink transition hover:bg-arcade-yellow/60 focus-visible:outline-3 focus-visible:outline-offset-2 sm:text-xs"
    >
      {d.coins.balance(total)}
    </Link>
  );
}
