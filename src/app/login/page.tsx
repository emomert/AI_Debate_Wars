"use client";

/**
 * Login (docs/19) — email + password (sign in / create account), magic-link
 * email, and Google OAuth (GitHub removed 7/12 by owner decision). Since the
 * coin economy went live, an account is required to RUN matches. Renders a
 * friendly notice if Supabase isn't configured on this deployment.
 *
 * Consent (P0-7): the explicit 13+/terms checkbox applies to the email
 * SIGNUP form only; Google/magic-link stay one-click with the passive
 * "by continuing you agree" notice (owner reverted the hard gate 7/12).
 *
 * New users (no profiles row yet) are routed through /welcome to create their
 * fighter card: OAuth and email links via the /auth/callback redirect, and
 * password sign-ins via the client-side check in finishSignIn below.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { GoogleIcon } from "@/components/auth/ProviderIcons";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TERMS_VERSION } from "@/lib/constants";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

type Mode = "signin" | "signup";
type Busy = "password" | "magic" | "reset" | "google" | null;
type Sent = { kind: "magic" | "confirm" | "reset"; email: string } | null;

/** Device-remembered consent affirmation, re-asked whenever the terms change. */
const CONSENT_ACK_KEY = `debator:consent-ack:${TERMS_VERSION}`;

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
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState<Sent>(null);
  const [busy, setBusy] = useState<Busy>(null);
  // Consent + age gate (P0-7, widened July 2026): the explicit "13+ and agree"
  // affirmation now gates EVERY account-creating path — email+password signup,
  // Magic Link, and Google/GitHub (any of them creates an account on first
  // use). Remembered per device so returning users aren't re-nagged.
  const [agreed, setAgreed] = useState(false);

  // Pre-tick from this device's earlier affirmation (keyed by terms version so
  // a terms bump re-asks). localStorage is unavailable during SSR — hydrate in
  // an effect.
  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_ACK_KEY) === "1") setAgreed(true);
    } catch {
      /* storage blocked — the checkbox just starts unticked */
    }
  }, []);

  const updateAgreed = (next: boolean) => {
    setAgreed(next);
    try {
      if (next) localStorage.setItem(CONSENT_ACK_KEY, "1");
      else localStorage.removeItem(CONSENT_ACK_KEY);
    } catch {
      /* storage blocked — gate still works for this visit */
    }
  };
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
  // save). The callback sanitizes `next` to a same-origin path. Lazy (called
  // from handlers only) so SSR never touches `window`.
  const nextParam = params.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const callbackUrl = () =>
    `${window.location.origin}/auth/callback${
      nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""
    }`;

  // Consent recorded at the SIGNUP gesture (P0-7), straight into the user's auth
  // metadata. This captures consent unconditionally for the email + magic-link
  // paths, independent of the /welcome profile stamp (which only runs for
  // brand-new, profile-less users and is skipped once any profile row exists).
  const consentMetadata = () => ({
    age_confirmed: true,
    terms_accepted_at: new Date().toISOString(),
    terms_version: TERMS_VERSION,
  });

  // Map raw GoTrue messages to friendly, on-brand copy so the failure-prone auth
  // moments don't leak backend strings ("Invalid login credentials", etc.).
  const friendlyAuthError = (msg: string): string => {
    const m = (msg || "").toLowerCase();
    if (m.includes("invalid login credentials")) return d.auth.login.errors.invalidCredentials;
    if (m.includes("already registered") || m.includes("already exists") || m.includes("already been registered"))
      return d.auth.login.errors.alreadyRegistered;
    if (m.includes("security purposes") || m.includes("rate limit") || m.includes("too many"))
      return d.auth.login.errors.rateLimited;
    if (m.includes("password") && (m.includes("least") || m.includes("weak") || m.includes("short") || m.includes("6 char")))
      return d.auth.login.errors.weakPassword;
    return d.auth.login.errors.generic;
  };

  /** Password sign-ins skip /auth/callback, so the "new user → create your
   *  fighter card" routing happens here instead. */
  const finishSignIn = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    router.replace(
      data
        ? nextPath
        : `/welcome${nextParam ? `?next=${encodeURIComponent(nextPath)}` : ""}`,
    );
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("password");
    setError(null);
    const credentials = { email: email.trim(), password };
    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) {
        setBusy(null);
        setError(friendlyAuthError(error.message));
        return;
      }
      await finishSignIn(data.user.id);
      return;
    }
    // Signup: enforce an 8-char minimum + confirm-password match BEFORE creating
    // the account, so a typo can't silently create a login the user can't access.
    if (password.length < 8) {
      setBusy(null);
      setError(d.auth.login.errors.weakPassword);
      return;
    }
    if (password !== confirmPassword) {
      setBusy(null);
      setError(d.auth.login.passwordMismatch);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      ...credentials,
      options: { emailRedirectTo: callbackUrl(), data: consentMetadata() },
    });
    setBusy(null);
    if (error) {
      setError(friendlyAuthError(error.message));
      return;
    }
    // With email confirmation enabled there's no session yet — the account
    // activates via the emailed link (which routes through /auth/callback).
    if (data.session && data.user) {
      setBusy("password");
      await finishSignIn(data.user.id);
      return;
    }
    setSent({ kind: "confirm", email: credentials.email });
  };

  const sendMagicLink = async () => {
    setBusy("magic");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl(), data: consentMetadata() },
    });
    setBusy(null);
    if (error) setError(friendlyAuthError(error.message));
    else setSent({ kind: "magic", email: email.trim() });
  };

  const sendPasswordReset = async () => {
    if (email.trim() === "") {
      setError(d.auth.login.needEmailForReset);
      return;
    }
    setBusy("reset");
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    setBusy(null);
    if (error) setError(friendlyAuthError(error.message));
    else setSent({ kind: "reset", email: email.trim() });
  };

  const signInWithOAuth = async (provider: "google") => {
    setBusy(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setBusy(null);
      setError(friendlyAuthError(error.message));
    }
    // On success the browser navigates to the provider, so no further UI needed.
  };

  const sentCopy: Record<NonNullable<Sent>["kind"], { title: string; before: string; after: string }> = {
    magic: { title: d.auth.login.sentTitle, before: d.auth.login.sentBefore, after: d.auth.login.sentAfter },
    confirm: { title: d.auth.login.confirmTitle, before: d.auth.login.confirmBefore, after: d.auth.login.confirmAfter },
    reset: { title: d.auth.login.resetTitle, before: d.auth.login.resetBefore, after: d.auth.login.resetAfter },
  };

  return (
    <GameShell>
      <GamePanel className="mx-auto max-w-md">
        <h1 className="font-display text-3xl tracking-tight">{d.auth.login.title}</h1>

        {error ? (
          <p className="mt-4 rounded-card border-3 border-arcade-red bg-arcade-red/10 p-3 text-sm font-semibold text-ink">
            {error}
          </p>
        ) : null}

        {sent ? (
          <div className="mt-5 rounded-card border-3 border-arcade-green bg-arcade-green/10 p-4 text-center">
            <p className="font-heading text-lg font-extrabold">{sentCopy[sent.kind].title}</p>
            <p className="mt-1 text-sm text-ink/70">
              {sentCopy[sent.kind].before}
              <span className="font-semibold">{sent.email}</span>
              {sentCopy[sent.kind].after}
            </p>
          </div>
        ) : (
          <>
            {/* Sign in ↔ create account toggle */}
            <div className="mt-5 grid grid-cols-2 gap-1.5" role="group" aria-label={d.auth.login.title}>
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-btn border-3 border-ink px-3 py-1.5 text-sm font-extrabold transition focus-visible:outline-3 focus-visible:outline-offset-2",
                    mode === m ? "bg-night text-white shadow-hard-sm" : "bg-surface hover:bg-paper",
                  )}
                >
                  {m === "signin" ? d.auth.login.modeSignIn : d.auth.login.modeSignUp}
                </button>
              ))}
            </div>

            <form onSubmit={submitPassword} className="mt-4 space-y-3">
              <div>
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
                  className="mt-1 w-full rounded-card border-4 border-ink bg-paper px-4 py-3 font-body text-base outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2"
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="password" className="block font-heading text-sm font-extrabold">
                    {d.auth.login.passwordLabel}
                  </label>
                  {mode === "signin" ? (
                    <button
                      type="button"
                      onClick={sendPasswordReset}
                      disabled={busy !== null}
                      className="text-xs font-bold text-ink/55 underline decoration-2 underline-offset-2 transition hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2"
                    >
                      {busy === "reset" ? d.auth.login.sending : d.auth.login.forgotCta}
                    </button>
                  ) : null}
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={mode === "signup" ? 8 : 6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={d.auth.login.passwordPlaceholder}
                  className="mt-1 w-full rounded-card border-4 border-ink bg-paper px-4 py-3 font-body text-base outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2"
                />
                {mode === "signup" ? (
                  <p className="mt-1 text-[11px] text-ink/45">{d.auth.login.passwordHint}</p>
                ) : null}
              </div>
              {mode === "signup" ? (
                <div>
                  <label htmlFor="confirm-password" className="block font-heading text-sm font-extrabold">
                    {d.auth.login.confirmLabel}
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={d.auth.login.passwordPlaceholder}
                    className="mt-1 w-full rounded-card border-4 border-ink bg-paper px-4 py-3 font-body text-base outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2"
                  />
                </div>
              ) : null}
              {mode === "signup" ? (
                // Explicit 13+/terms affirmation for the email SIGNUP form only
                // (P0-7); Google/magic-link rely on the passive notice below.
                // Remembered per device so repeat signups come pre-ticked.
                <label className="flex items-start gap-2 text-[12px] leading-snug text-ink/70">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => updateAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-arcade-green"
                  />
                  <span>
                    {d.auth.login.consentBefore}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline decoration-2 underline-offset-2"
                    >
                      {d.auth.login.consentTerms}
                    </a>
                    {d.auth.login.consentAnd}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline decoration-2 underline-offset-2"
                    >
                      {d.auth.login.consentPrivacy}
                    </a>
                    {d.auth.login.consentAfter}
                  </span>
                </label>
              ) : null}
              <ArcadeButton
                type="submit"
                variant="primary-green"
                fullWidth
                disabled={
                  busy !== null ||
                  email.trim() === "" ||
                  password === "" ||
                  (mode === "signup" && !agreed)
                }
              >
                {busy === "password"
                  ? mode === "signin"
                    ? d.auth.login.signingIn
                    : d.auth.login.creatingAccount
                  : mode === "signin"
                    ? d.auth.login.signInCta
                    : d.auth.login.signUpCta}
              </ArcadeButton>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-ink/40">
              <span className="h-[2px] flex-1 bg-ink/15" />
              {d.auth.login.or}
              <span className="h-[2px] flex-1 bg-ink/15" />
            </div>

            <div className="space-y-2">
              <ArcadeButton
                variant="neutral-white"
                fullWidth
                disabled={busy !== null || email.trim() === ""}
                onClick={sendMagicLink}
              >
                {busy === "magic" ? d.auth.login.sending : d.auth.login.magicLinkCta}
              </ArcadeButton>
              <ArcadeButton
                variant="neutral-white"
                fullWidth
                disabled={busy !== null}
                onClick={() => signInWithOAuth("google")}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <GoogleIcon />
                  {busy === "google" ? d.auth.login.redirecting : d.auth.login.googleCta}
                </span>
              </ArcadeButton>
            </div>

            {/* Passive consent (P0-7) covering the passwordless paths (magic
                link / OAuth), which create accounts on first use. The data-
                location disclosure lives in the Privacy Policy (owner 7/12:
                removed the duplicate note here). */}
            <p className="mt-3 text-[11px] leading-snug text-ink/45">
              {d.auth.login.consentNote}
            </p>
          </>
        )}
      </GamePanel>
    </GameShell>
  );
}
