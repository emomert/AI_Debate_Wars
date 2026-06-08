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
import { useT } from "@/lib/i18n/LocaleProvider";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

// useSearchParams (in LoginForm) needs a Suspense boundary in the App Router.
function LoginFallback() {
  const d = useT();
  return (
    <GameShell>
      <GamePanel className="mx-auto max-w-md text-center text-sm text-ink/55">
        {d.auth.login.loading}
      </GamePanel>
    </GameShell>
  );
}

function LoginForm() {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<"magic" | "google" | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") ? d.auth.login.linkError : null,
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
          <p className="font-heading text-xl font-extrabold">{d.auth.login.notSetUpTitle}</p>
          <p className="mt-2 text-sm text-ink/60">
            {d.auth.login.notSetUpBody}
          </p>
        </GamePanel>
      </GameShell>
    );
  }

  // Return the user to where they came from (e.g. the match they wanted to
  // save). The callback sanitizes `next` to a same-origin path.
  const nextParam = params.get("next");
  const callbackUrl = `${window.location.origin}/auth/callback${
    nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""
  }`;

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("magic");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl },
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
      options: { redirectTo: callbackUrl },
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
        <h1 className="font-display text-3xl tracking-tight">{d.auth.login.title}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {d.auth.login.subtitle}
        </p>

        {error ? (
          <p className="mt-4 rounded-card border-3 border-arcade-red bg-arcade-red/10 p-3 text-sm font-semibold text-ink">
            {error}
          </p>
        ) : null}

        {sent ? (
          <div className="mt-5 rounded-card border-3 border-arcade-green bg-arcade-green/10 p-4 text-center">
            <p className="font-heading text-lg font-extrabold">{d.auth.login.sentTitle}</p>
            <p className="mt-1 text-sm text-ink/70">
              {d.auth.login.sentBefore}
              <span className="font-semibold">{email}</span>
              {d.auth.login.sentAfter}
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={sendMagicLink} className="mt-5 space-y-3">
              <label htmlFor="email" className="block font-heading text-sm font-extrabold">
                {d.auth.login.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={d.auth.login.emailPlaceholder}
                className="w-full rounded-card border-4 border-ink bg-paper px-4 py-3 font-body text-base outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2"
              />
              <ArcadeButton
                type="submit"
                variant="primary-green"
                fullWidth
                disabled={busy !== null || email.trim() === ""}
              >
                {busy === "magic" ? d.auth.login.sending : d.auth.login.magicLinkCta}
              </ArcadeButton>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-ink/40">
              <span className="h-[2px] flex-1 bg-ink/15" />
              {d.auth.login.or}
              <span className="h-[2px] flex-1 bg-ink/15" />
            </div>

            <ArcadeButton
              variant="neutral-white"
              fullWidth
              disabled={busy !== null}
              onClick={signInWithGoogle}
            >
              {busy === "google" ? d.auth.login.redirecting : d.auth.login.googleCta}
            </ArcadeButton>
          </>
        )}
      </GamePanel>
    </GameShell>
  );
}
