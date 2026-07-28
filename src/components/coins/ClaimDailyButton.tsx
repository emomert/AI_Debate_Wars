"use client";

/**
 * ClaimDailyButton (docs/23_COINS.md; migration 0014) — the button that
 * claims today's free daily allowance. The allowance is CLAIM-GATED: it stays
 * COMPUTED, never CREDITED — clicking this button does not insert coins into
 * coin_ledger, it only records that today was claimed (coin_claim_daily RPC),
 * which gates the existing (allowance − daily_spent) computation everywhere
 * else. Renders nothing when there's nothing to claim (signed out, coins off,
 * no Supabase, status not loaded, or already claimed today) so it never
 * flashes before auth resolves — same `checked` guard pattern as
 * MatchSaver.tsx / CoinBalance.tsx.
 *
 * Mounted in two places (owner 2026-07-28): the header control cluster
 * (`variant="chip"`, GameShell.tsx) and the /pricing free-tier card
 * (`variant="panel"`).
 */

import { useEffect, useState } from "react";

import {
  COINS_CHANGED_EVENT,
  claimDaily,
  fetchCoinStatus,
  notifyCoinsChanged,
  type CoinStatus,
} from "@/lib/coins/client";
import { FREE_DAILY_COINS } from "@/lib/coins/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

type ClaimUiState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "success" }
  | { kind: "error"; rateLimited: boolean };

// How long the success confirmation stays visible before the component
// settles into its normal "already claimed → render nothing" state.
const SUCCESS_LINGER_MS = 2200;

export function ClaimDailyButton({ variant }: { variant: "chip" | "panel" }) {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<CoinStatus | null>(null);
  const [ui, setUi] = useState<ClaimUiState>({ kind: "idle" });

  useEffect(() => {
    if (!supabase) {
      setChecked(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
      setChecked(true);
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
    // A user who leaves the tab open past midnight UTC should see the button
    // come back — re-check on focus and whenever anything changes the balance.
    window.addEventListener("focus", refresh);
    window.addEventListener(COINS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.removeEventListener(COINS_CHANGED_EVENT, refresh);
    };
  }, [supabase, userId]);

  const claim = async () => {
    if (!supabase || ui.kind === "busy") return;
    playSound("buttonClick");
    setUi({ kind: "busy" });
    const res = await claimDaily(supabase);
    if (res.ok) {
      playSound("modelSelected");
      setStatus(res.status);
      notifyCoinsChanged();
      setUi({ kind: "success" });
      window.setTimeout(() => setUi({ kind: "idle" }), SUCCESS_LINGER_MS);
      return;
    }
    setUi({ kind: "error", rateLimited: res.result === "RATE_LIMITED" });
  };

  if (!supabase || !checked || !userId || !status) return null;
  // Nothing to claim: already claimed today, and we're not mid-confirmation.
  if (status.claimedToday && ui.kind !== "success") return null;

  if (variant === "panel") {
    if (ui.kind === "success") {
      return (
        <p className="mt-3 text-sm font-bold text-arcade-green" role="status">
          {d.coins.claim.claimed}
        </p>
      );
    }
    return (
      <div className="mt-3">
        <ArcadeButton
          variant="primary-yellow"
          disabled={ui.kind === "busy"}
          onClick={claim}
        >
          {ui.kind === "busy" ? d.coins.claim.busy : d.coins.claim.cta(FREE_DAILY_COINS)}
        </ArcadeButton>
        {ui.kind === "error" ? (
          <p className="mt-2 text-sm font-bold text-arcade-red" role="alert">
            {ui.rateLimited ? d.coins.claim.rateLimited : d.coins.claim.error}
          </p>
        ) : null}
      </div>
    );
  }

  // chip — compact, sits beside the header coin balance chip.
  if (ui.kind === "success") {
    return (
      <span
        role="status"
        className="shrink-0 rounded-btn border-3 border-ink bg-arcade-green/30 px-2 py-1 font-heading text-[11px] font-extrabold uppercase tracking-wide text-ink sm:text-xs"
      >
        {d.coins.claim.claimedShort}
      </span>
    );
  }
  // Error: the button itself becomes the visible message (short, so the
  // crowded header cluster doesn't wrap) — clicking it retries.
  const errorLabel = ui.kind === "error" ? (ui.rateLimited ? d.coins.claim.rateLimitedShort : d.coins.claim.errorShort) : null;
  return (
    <button
      type="button"
      role={ui.kind === "error" ? "alert" : undefined}
      onClick={claim}
      disabled={ui.kind === "busy"}
      aria-label={
        ui.kind === "error"
          ? (ui.rateLimited ? d.coins.claim.rateLimited : d.coins.claim.error)
          : d.coins.claim.cta(FREE_DAILY_COINS)
      }
      title={d.coins.claim.cta(FREE_DAILY_COINS)}
      className={cn(
        "shrink-0 rounded-btn border-3 border-ink px-2 py-1 font-heading text-[11px] font-extrabold uppercase tracking-wide text-ink transition focus-visible:outline-3 focus-visible:outline-offset-2 sm:text-xs",
        ui.kind === "error"
          ? "bg-arcade-red/30 hover:bg-arcade-red/60"
          : "bg-arcade-green/30 hover:bg-arcade-green/60",
        ui.kind === "busy" && "cursor-not-allowed opacity-60",
      )}
    >
      {ui.kind === "busy"
        ? d.coins.claim.busy
        : errorLabel ?? d.coins.claim.chipCta(FREE_DAILY_COINS)}
    </button>
  );
}
