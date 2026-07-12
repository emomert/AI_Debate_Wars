"use client";

/**
 * PricingPopup — the once-per-device tier intro shown to signed-in users on
 * the setup screen after signup (docs/23_COINS.md). Explains the daily free
 * coins and the three packs; both actions dismiss it permanently for this
 * device. The parent mounts it only when COINS_ENABLED.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import { COIN_PACKS } from "@/lib/coins/economy";
import { FREE_DAILY_COINS } from "@/lib/coins/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

const SEEN_KEY = "ada:coins-intro-v1";

export function PricingPopup() {
  const d = useT();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Open once: signed-in + never seen on this device.
  useEffect(() => {
    if (!supabase) return;
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {
      return;
    }
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage blocked — it'll show again, harmless */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={d.coins.popup.title}
      className="fixed inset-0 z-50 grid place-items-center bg-night/80 p-4 outline-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-md rounded-modal border-4 border-ink bg-paper p-5 shadow-hard-lg">
        <p className="font-display text-2xl tracking-tight">{d.coins.popup.title}</p>
        <p className="mt-2 text-sm text-ink/70">{d.coins.popup.body(FREE_DAILY_COINS)}</p>

        <div className="mt-4 space-y-1.5">
          {COIN_PACKS.map((p) => (
            <div
              key={p.usd}
              className="flex items-center justify-between rounded-card border-3 border-ink bg-surface px-3 py-2"
            >
              <span className="font-heading text-sm font-extrabold">
                {d.coins.pricing.packHeading(p.coins)}
              </span>
              <span className="font-mono text-sm font-bold">${p.usd.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ArcadeButton
            variant="neutral-white"
            onClick={() => {
              playSound("buttonClick");
              close();
              router.push("/pricing");
            }}
          >
            {d.coins.popup.seePricing}
          </ArcadeButton>
          <ArcadeButton
            variant="primary-green"
            onClick={() => {
              playSound("buttonClick");
              close();
            }}
          >
            {d.coins.popup.dismiss}
          </ArcadeButton>
        </div>
      </div>
    </div>
  );
}
