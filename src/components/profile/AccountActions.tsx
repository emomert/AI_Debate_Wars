"use client";

/**
 * AccountActions — data export + full account deletion (GDPR/CCPA). Export pulls
 * the signed-in user's own rows (RLS-scoped) into a JSON download; delete calls
 * the delete_my_account() RPC (cascades to profile, matches, shared matches,
 * votes, comments), then signs out. Two-step confirm on the destructive action.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import { GamePanel } from "@/components/game/GamePanel";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LocaleProvider";

export function AccountActions({ userId }: { userId: string }) {
  const d = useT();
  const t = d.profile.account;
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setExporting(true);
    setError(null);
    try {
      // RLS returns only this user's own rows for each table.
      const [profile, consent, matches, shared, votes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("profile_consent").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("matches").select("*").order("created_at", { ascending: false }),
        supabase.from("shared_matches").select("*").eq("owner_id", userId),
        supabase.from("shared_match_votes").select("*").eq("user_id", userId),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        profile: profile.data ?? null,
        consent: consent.data ?? null,
        matches: matches.data ?? [],
        sharedMatches: shared.data ?? [],
        votes: votes.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "debator-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("[account] export failed:", err);
      setError(t.exportError);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setDeleting(true);
    setError(null);
    const { error: rpcErr } = await supabase.rpc("delete_my_account");
    if (rpcErr) {
      console.warn("[account] delete failed:", rpcErr.message);
      setError(t.deleteError);
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <GamePanel title={t.title} className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <ArcadeButton variant="neutral-white" size="sm" onClick={exportData} disabled={exporting}>
          {exporting ? t.exporting : t.exportCta}
        </ArcadeButton>

        {confirming ? (
          <span className="inline-flex items-center gap-1.5">
            <ArcadeButton variant="danger-red" size="sm" onClick={deleteAccount} disabled={deleting}>
              {deleting ? t.deleting : t.deleteConfirm}
            </ArcadeButton>
            <ArcadeButton
              variant="neutral-white"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              {t.deleteCancel}
            </ArcadeButton>
          </span>
        ) : (
          <ArcadeButton variant="neutral-white" size="sm" onClick={() => setConfirming(true)}>
            {t.deleteCta}
          </ArcadeButton>
        )}
      </div>

      {confirming ? (
        <p className="mt-2 text-xs font-semibold text-arcade-red">{t.deleteWarn}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-arcade-red">{error}</p>
      ) : null}
    </GamePanel>
  );
}
