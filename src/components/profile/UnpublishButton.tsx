"use client";

/**
 * UnpublishButton — removes one of the user's shared matches from the
 * community (votes and comments go with it, by FK cascade). Two-step inline
 * confirm, mirroring DeleteMatchButton; RLS scopes the delete to own rows.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { useT } from "@/lib/i18n/LocaleProvider";

export function UnpublishButton({ postId }: { postId: string }) {
  const d = useT();
  const t = d.community.myShared;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const del = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("shared_matches").delete().eq("id", postId);
    setBusy(false);
    if (error) {
      console.error("[unpublish] failed:", error.message);
      return;
    }
    router.refresh();
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <ArcadeButton size="sm" variant="danger-red" onClick={del} disabled={busy}>
          {busy ? t.removing : t.confirmUnpublish}
        </ArcadeButton>
        <ArcadeButton
          size="sm"
          variant="neutral-white"
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          {t.cancel}
        </ArcadeButton>
      </span>
    );
  }

  return (
    <ArcadeButton
      size="sm"
      variant="neutral-white"
      onClick={() => setConfirming(true)}
      aria-label={t.unpublishAria}
    >
      🗑
    </ArcadeButton>
  );
}
