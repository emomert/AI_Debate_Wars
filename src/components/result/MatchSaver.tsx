"use client";

/**
 * MatchSaver (docs/19 Phase 2). When a COMPLETE match is on screen and the user
 * is signed in, upsert it to their Supabase history (idempotent on the session
 * id, so a re-judge — which bumps updatedAt — saves an update, while merely
 * REOPENING a saved match does not re-write the heavy blob). Renders a small
 * confirmation, a quiet failure note, or nothing (auth off / signed out). RLS
 * guarantees a user only writes their own rows.
 */

import { useEffect, useState } from "react";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toMatchRow } from "@/lib/supabase/matches";

// Generous client-side cap so a giant transcript can't be pushed to the DB
// (the migration also enforces a hard cap server-side).
const MAX_ROW_BYTES = 500_000;

// app_session_id|updatedAt already written this tab — so reopening a saved match
// (which lands a complete session on /result) doesn't re-upsert it or re-toast.
const persisted = new Set<string>();
const keyOf = (s: DebateSession) => `${s.id}|${s.updatedAt}`;

/** Mark a session as already-persisted (called when reopening from history). */
export function markMatchPersisted(session: DebateSession): void {
  persisted.add(keyOf(session));
}

export function MatchSaver({ session }: { session: DebateSession }) {
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || session.status !== "complete") return;
    setSaved(false);
    setFailed(false);
    const key = keyOf(session);
    if (persisted.has(key)) return; // reopened from history — nothing new to save
    let active = true;
    (async () => {
      // getSession reads the (middleware-refreshed) cookie locally — no network.
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || !active) return;
      const row = toMatchRow(session, userId);
      if (JSON.stringify(row).length > MAX_ROW_BYTES) {
        console.warn("[MatchSaver] match too large to save");
        return;
      }
      const { error } = await supabase
        .from("matches")
        .upsert(row, { onConflict: "user_id,app_session_id" });
      if (!active) return;
      if (error) {
        console.warn("[MatchSaver] save failed:", error.message);
        setFailed(true);
        return;
      }
      persisted.add(key);
      setSaved(true);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  if (failed) {
    return (
      <p className="text-center text-xs font-semibold text-arcade-red">
        Couldn&apos;t save to your profile.
      </p>
    );
  }
  if (!saved) return null;
  return (
    <p className="text-center text-xs font-semibold text-arcade-green">
      ✓ Saved to your profile
    </p>
  );
}
