"use client";

/**
 * SignupGateModal — the "sign up first" warning shown when a signed-out user
 * presses START THE MATCH (docs/23_COINS.md; owner 7/12: warn, don't yank them
 * straight to the login page). The CTA carries them to signup with a return
 * path back to their configured setup.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import { FREE_DAILY_COINS } from "@/lib/coins/config";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

export function SignupGateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useT();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={d.coins.gate.title}
      className="fixed inset-0 z-50 grid place-items-center bg-night/80 p-4 outline-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-modal border-4 border-ink bg-paper p-5 text-center shadow-hard-lg">
        <p className="text-3xl" aria-hidden>
          🔐
        </p>
        <p className="mt-1 font-display text-2xl tracking-tight">{d.coins.gate.title}</p>
        <p className="mt-2 text-sm text-ink/70">{d.coins.gate.body(FREE_DAILY_COINS)}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ArcadeButton
            variant="primary-green"
            onClick={() => {
              playSound("buttonClick");
              onClose();
              router.push("/login?next=/setup");
            }}
          >
            {d.coins.gate.cta}
          </ArcadeButton>
          <ArcadeButton variant="neutral-white" onClick={onClose}>
            {d.coins.gate.later}
          </ArcadeButton>
        </div>
      </div>
    </div>
  );
}
