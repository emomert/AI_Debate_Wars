"use client";

/**
 * DeleteMatchButton — removes a single match from history. Two-step inline
 * confirm (no jarring browser dialog). Deletes via the browser Supabase client;
 * RLS scopes the delete to the signed-in user's own row. Refreshes the server
 * component so the list updates.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { useT } from "@/lib/i18n/LocaleProvider";

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  const d = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const del = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) {
      console.error("[delete-match] failed:", error.message);
      setBusy(false); // re-enable so the user can retry
      return;
    }
    // Success: keep the button disabled in its "Deleting…" state — router.refresh()
    // removes this row a moment later, unmounting the button. Resetting busy here
    // would flash it back to a pressable state before the row disappears.
    router.refresh();
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <ArcadeButton size="sm" variant="danger-red" onClick={del} disabled={busy}>
          {busy ? d.profile.del.deleting : d.profile.del.confirm}
        </ArcadeButton>
        <ArcadeButton
          size="sm"
          variant="neutral-white"
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          {d.profile.del.cancel}
        </ArcadeButton>
      </span>
    );
  }

  return (
    <ArcadeButton
      size="sm"
      variant="neutral-white"
      onClick={() => setConfirming(true)}
      aria-label={d.profile.del.trigger}
    >
      🗑
    </ArcadeButton>
  );
}
