"use client";

/**
 * /welcome — first-sign-in onboarding (docs/19): create your fighter card
 * (handle + preset avatar) right after the account exists. Reached from
 * /auth/callback (OAuth, magic link, email confirm) or the login page
 * (password sign-in) when the user has no profiles row yet.
 *
 * Skippable: Skip writes a bare profiles row so the user is never routed
 * here again — they stay "Anonymous Fighter" until they edit /profile.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { ProfileForm } from "@/components/profile/ProfileEditor";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TERMS_VERSION } from "@/lib/constants";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function WelcomePage() {
  return (
    <Suspense fallback={<WelcomeFallback />}>
      <WelcomeInner />
    </Suspense>
  );
}

function WelcomeFallback() {
  const d = useT();
  return (
    <GameShell>
      <GamePanel className="mx-auto max-w-lg text-center text-sm text-ink/55">
        {d.auth.login.loading}
      </GamePanel>
    </GameShell>
  );
}

function WelcomeInner() {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const params = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  const nextParam = params.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  // Signed-out (or auth disabled) → nothing to onboard; go sign in.
  useEffect(() => {
    if (!supabase) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      // Record signup consent (P0-7): reaching /welcome means the user just
      // affirmed 13+ & Terms on the login form (the explicit checkbox for email
      // signup, or the consent notice for the magic-link / OAuth paths). Stamp it
      // durably on the profile row. The payload sets ONLY the consent columns, so
      // it never clobbers a handle/avatar chosen later in the fighter-card form.
      // Log (don't swallow) a failed write so a dropped consent record is visible.
      supabase
        .from("profiles")
        .upsert(
          {
            user_id: data.user.id,
            terms_accepted_at: new Date().toISOString(),
            age_confirmed: true,
            terms_version: TERMS_VERSION,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .then(({ error }) => {
          if (error) console.error("[welcome] consent upsert failed:", error.message);
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = async () => {
    if (!supabase || !userId) return;
    setSkipping(true);
    // A bare row marks onboarding as seen without touching handle/avatar.
    await supabase.from("profiles").upsert(
      { user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    router.replace(nextPath);
  };

  if (!userId) return <WelcomeFallback />;

  return (
    <GameShell>
      <GamePanel className="mx-auto max-w-lg" title={d.auth.welcome.title}>
        <p className="text-sm text-ink/65">{d.auth.welcome.subtitle}</p>
        <ProfileForm userId={userId} onSaved={() => router.replace(nextPath)} />
        <div className="mt-4 border-t-3 border-ink/10 pt-3">
          <ArcadeButton
            variant="neutral-white"
            size="sm"
            onClick={skip}
            disabled={skipping}
          >
            {d.auth.welcome.skip}
          </ArcadeButton>
        </div>
      </GamePanel>
    </GameShell>
  );
}
