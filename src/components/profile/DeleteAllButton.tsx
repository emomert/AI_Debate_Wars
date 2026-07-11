"use client";

/**
 * DeleteAllButton — wipes the signed-in user's entire match history. Two-step
 * confirm with the count, since it's destructive and irreversible. Deletes every
 * row for the user (RLS double-scopes it); refreshes the server list.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { useT } from "@/lib/i18n/LocaleProvider";

export function DeleteAllButton({ userId, total }: { userId: string; total: number }) {
  const d = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const deleteAll = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("matches").delete().eq("user_id", userId);
    if (error) {
      console.error("[delete-all] failed:", error.message);
      setBusy(false); // re-enable so the user can retry
      return;
    }
    // Success: keep the button disabled in its "Deleting…" state — router.refresh()
    // re-renders the profile with an empty history, unmounting this control.
    // Resetting busy here would flash it back to a pressable state first.
    router.refresh();
  };

  if (!confirming) {
    return (
      <ArcadeButton size="sm" variant="neutral-white" onClick={() => setConfirming(true)}>
        {d.profile.del.deleteAll}
      </ArcadeButton>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs font-semibold text-ink/70">
        {d.profile.del.deleteAllConfirm(total)}
      </span>
      <ArcadeButton size="sm" variant="danger-red" onClick={deleteAll} disabled={busy}>
        {busy ? d.profile.del.deletingAll : d.profile.del.deleteAllAction}
      </ArcadeButton>
      <ArcadeButton
        size="sm"
        variant="neutral-white"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        {d.profile.del.cancel}
      </ArcadeButton>
    </div>
  );
}
