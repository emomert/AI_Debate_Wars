"use client";

/**
 * AuthButton — header sign-in / account widget (docs/19). Shows "Sign in" when
 * signed out, or an avatar with a Sign-out menu when signed in. Renders nothing
 * when Supabase isn't configured.
 *
 * State comes from onAuthStateChange (which emits INITIAL_SESSION on subscribe),
 * so there's NO /auth/v1/user network round-trip just to paint the header — the
 * middleware already validates the token server-side and RLS guards the data, so
 * the locally-persisted session is enough to choose Sign-in vs avatar.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/audio/soundManager";

export function AuthButton() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    // Safety net: settle the widget even if no auth event ever arrives.
    const t = setTimeout(() => setReady(true), 4000);
    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Close the menu on an outside click or Escape; restore focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async () => {
    if (!supabase) return;
    playSound("buttonClick");
    setOpen(false);
    await supabase.auth.signOut();
    router.refresh();
  };

  if (!supabase) return null; // auth disabled
  // Reserve the slot until the first auth state resolves, so the header doesn't
  // reflow when the button pops in.
  if (!ready) return <span aria-hidden className="inline-flex h-9 w-9" />;

  if (!user) {
    return (
      <Link
        href="/login"
        onClick={() => playSound("buttonClick")}
        className="inline-flex h-9 items-center rounded-btn border-3 border-ink bg-surface px-3 font-heading text-sm font-extrabold transition hover:bg-arcade-yellow hover:text-night focus-visible:outline-[3px] focus-visible:outline-offset-2"
      >
        Sign in
      </Link>
    );
  }

  const email = user.email ?? "Account";
  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          playSound("buttonClick");
          setOpen((v) => !v);
        }}
        aria-haspopup="true"
        aria-expanded={open}
        title={email}
        className="grid h-9 w-9 place-items-center rounded-btn border-3 border-ink bg-arcade-purple font-heading text-sm font-extrabold text-white focus-visible:outline-[3px] focus-visible:outline-offset-2"
      >
        {initial}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-52 rounded-card border-3 border-ink bg-card p-2 shadow-hard-sm">
          <p className="truncate px-2 py-1 text-[11px] text-ink/55" title={email}>
            {email}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-btn border-2 border-ink bg-surface px-2 py-1.5 text-left font-heading text-sm font-bold transition hover:bg-arcade-red hover:text-white focus-visible:outline-[3px] focus-visible:outline-offset-2"
          >
            ⏏ Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
