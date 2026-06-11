"use client";

/**
 * /reset-password — sets a new password after a recovery link. The emailed
 * link goes through /auth/callback (which establishes the recovery session)
 * and lands here with the user signed in; without a session the link has
 * expired and we point back to /login.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function ResetPasswordPage() {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [sessionState, setSessionState] = useState<"checking" | "ok" | "none">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSessionState("none");
      return;
    }
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setSessionState(data.user ? "ok" : "none");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < 6) {
      setError(d.auth.reset.tooShort);
      return;
    }
    if (password !== confirm) {
      setError(d.auth.reset.mismatch);
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }
    router.replace("/profile");
  };

  if (sessionState === "checking") {
    return (
      <GameShell>
        <GamePanel className="mx-auto max-w-md text-center text-sm text-ink/55">
          {d.auth.login.loading}
        </GamePanel>
      </GameShell>
    );
  }

  if (sessionState === "none") {
    return (
      <GameShell>
        <GamePanel className="mx-auto max-w-md text-center">
          <p className="font-heading text-xl font-extrabold">{d.auth.reset.expiredTitle}</p>
          <p className="mt-2 text-sm text-ink/60">{d.auth.reset.expiredBody}</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-btn border-3 border-ink bg-arcade-yellow px-4 py-2 text-sm font-extrabold text-night transition hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2"
          >
            {d.auth.reset.goLogin}
          </Link>
        </GamePanel>
      </GameShell>
    );
  }

  return (
    <GameShell>
      <GamePanel className="mx-auto max-w-md">
        <h1 className="font-display text-3xl tracking-tight">{d.auth.reset.title}</h1>
        <p className="mt-1 text-sm text-ink/60">{d.auth.reset.subtitle}</p>

        {error ? (
          <p className="mt-4 rounded-card border-3 border-arcade-red bg-arcade-red/10 p-3 text-sm font-semibold text-ink">
            {error}
          </p>
        ) : null}

        <form onSubmit={save} className="mt-5 space-y-3">
          <div>
            <label htmlFor="new-password" className="block font-heading text-sm font-extrabold">
              {d.auth.reset.newLabel}
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-card border-4 border-ink bg-paper px-4 py-3 font-body text-base outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block font-heading text-sm font-extrabold">
              {d.auth.reset.confirmLabel}
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-card border-4 border-ink bg-paper px-4 py-3 font-body text-base outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2"
            />
          </div>
          <ArcadeButton
            type="submit"
            variant="primary-green"
            fullWidth
            disabled={saving || password === "" || confirm === ""}
          >
            {saving ? d.auth.reset.saving : d.auth.reset.save}
          </ArcadeButton>
        </form>
      </GamePanel>
    </GameShell>
  );
}
