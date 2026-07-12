"use client";

/**
 * PromoRedeem — the promo-code input + redeem flow (docs/23_COINS.md), shared
 * by /pricing and the /welcome onboarding. Assumes a signed-in user (callers
 * gate on auth); all guardrails (one per account, expiry, caps, attempt
 * limiting) live in the coin_redeem_promo RPC.
 */

import { useState } from "react";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import { notifyCoinsChanged } from "@/lib/coins/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

type PromoState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "success"; coins: number }
  | { kind: "error"; message: string };

export function PromoRedeem() {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<PromoState>({ kind: "idle" });

  if (!supabase) return null;

  const redeem = async () => {
    if (code.trim() === "") return;
    playSound("buttonClick");
    setPromo({ kind: "busy" });
    const { data, error } = await supabase.rpc("coin_redeem_promo", { p_code: code.trim() });
    if (error) {
      setPromo({ kind: "error", message: d.coins.pricing.promoErrors.UNKNOWN });
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { ok: boolean; result: string; coins: number }
      | undefined;
    if (row?.ok) {
      playSound("modelSelected");
      notifyCoinsChanged();
      setPromo({ kind: "success", coins: row.coins });
      setCode("");
      return;
    }
    const known = d.coins.pricing.promoErrors as Record<string, string>;
    setPromo({
      kind: "error",
      message: known[row?.result ?? "UNKNOWN"] ?? d.coins.pricing.promoErrors.UNKNOWN,
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={d.coins.pricing.promoPlaceholder}
          aria-label={d.coins.pricing.promoTitle}
          className="flex-1 rounded-card border-4 border-ink bg-paper px-4 py-2.5 font-mono text-sm uppercase outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2"
        />
        <ArcadeButton
          variant="primary-yellow"
          disabled={promo.kind === "busy" || code.trim() === ""}
          onClick={redeem}
        >
          {promo.kind === "busy" ? d.coins.pricing.promoRedeeming : d.coins.pricing.promoCta}
        </ArcadeButton>
      </div>
      {promo.kind === "success" ? (
        <p className="mt-2 text-sm font-bold text-arcade-green" role="status">
          {d.coins.pricing.promoSuccess(promo.coins)}
        </p>
      ) : null}
      {promo.kind === "error" ? (
        <p className="mt-2 text-sm font-bold text-arcade-red" role="alert">
          {promo.message}
        </p>
      ) : null}
    </div>
  );
}
