"use client";

/**
 * ReopenButton (docs/19 Phase 3). Fetches a stored match's full session blob on
 * click (kept out of the list payload), rehydrates it into the arena, and opens
 * the result screen.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useArena } from "@/lib/state/ArenaContext";
import { markMatchPersisted } from "@/components/result/MatchSaver";
import { ArcadeButton } from "@/components/game/ArcadeButton";

export function ReopenButton({ matchId }: { matchId: string }) {
  const { setSession } = useArena();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("matches")
      .select("session")
      .eq("id", matchId)
      .single();
    setBusy(false);
    if (error) {
      console.error("[reopen] failed to load match:", error.message);
      return;
    }
    if (data?.session) {
      const session = data.session as DebateSession;
      // It's already in history — don't let /result re-upsert it.
      markMatchPersisted(session);
      setSession(session);
      router.push("/result");
    }
  };

  return (
    <ArcadeButton size="sm" variant="neutral-white" onClick={open} disabled={busy}>
      {busy ? "Opening…" : "View"}
    </ArcadeButton>
  );
}
