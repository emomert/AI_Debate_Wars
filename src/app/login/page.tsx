"use client";

/**
 * Login (docs/19) — magic-link email + Google OAuth. Login is optional; it only
 * unlocks saved match history + stats. Renders a friendly notice if Supabase
 * isn't configured on this deployment.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  // useSearchParams (in LoginForm) needs a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <GameShell>
          <GamePanel className="mx-auto max-w-md text-center text-sm text-ink/55">
            Loading…
          </GamePanel>
        </GameShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"magic" | "google" | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "That sign-in link didn't work — please try again." : null,
  );

  // Drop ?error from the URL after reading it, so a refresh/back doesn't
  // re-surface a stale error banner.
  useEffect(() => {
    if (params.get("error")) router.replace("/login", { scroll: false });
  }, [params, router]);

  if (!supabase) {
    return (
      <GameShell>
        <GamePanel className="mx-auto max-w-md text-center">
          <p className="font-heading text-xl font-extrabold">Sign-in isn&apos;t set up yet</p>
          <p className="mt-2 text-sm text-ink/60">
            Accounts arrive soon. You can keep running debates without one.
          </p>
        </GamePanel>
      </GameShell>
    );
  }

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("magic");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(true);
  };

  const signInWithGoogle = async () => {
    setBusy("google");
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(null);
      setError(error.message);
    }
    // On success the browser navigates to Google, so no further UI needed.
  };

  return (
    <GameShell>
      <GamePanel className="mx-auto max-w-md">
        <h1 className="font-display text-3xl tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-ink/60">
          Save your matches, history and stats. Optional — debates work without an
          account.
        </p>

        {error ? (
          <p className="mt-4 rounded-card border-3 border-arcade-red bg-arcade-red/10 p-3 text-sm font-semibold text-ink">
            {error}
          </p>
        ) : null}

        {sent ? (
          <div className="mt-5 rounded-card border-3 border-arcade-green bg-arcade-green/10 p-4 text-center">
            <p className="font-heading text-lg font-extrabold">📬 Check your inbox</p>
            <p className="mt-1 text-sm text-ink/70">
              We sent a magic sign-in link to <span className="font-semibold">{email}</span>.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={sendMagicLink} className="mt-5 space-y-3">
              <label htmlFor="email" className="block font-heading text-sm font-extrabold">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-card border-4 border-ink bg-paper px-4 py-3 font-body text-base outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2"
              />
              <ArcadeButton
                type="submit"
                variant="primary-green"
                fullWidth
                disabled={busy !== null || email.trim() === ""}
              >
                {busy === "magic" ? "Sending…" : "✉️ Email me a magic link"}
              </ArcadeButton>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-ink/40">
              <span className="h-[2px] flex-1 bg-ink/15" />
              or
              <span className="h-[2px] flex-1 bg-ink/15" />
            </div>

            <ArcadeButton
              variant="neutral-white"
              fullWidth
              disabled={busy !== null}
              onClick={signInWithGoogle}
            >
              {busy === "google" ? "Redirecting…" : "🔵 Continue with Google"}
            </ArcadeButton>
          </>
        )}
      </GamePanel>
    </GameShell>
  );
}
