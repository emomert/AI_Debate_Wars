"use client";

/**
 * MatchSaver (docs/19 Phase 2). AUTO-saves a completed match to the signed-in
 * user's history (July 2026 owner decision — reverses the earlier button-only
 * choice: the profile's "Completed matches" stat counts these rows, so relying
 * on a manual click left it at 0). Signed out → a sign-in nudge; auth off →
 * nothing; a failure surfaces a visible retry button. RLS guarantees a user
 * only writes their own rows; idempotent on the session id (a re-judge bumps
 * updatedAt and re-saves).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toMatchRow } from "@/lib/supabase/matches";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { useT } from "@/lib/i18n/LocaleProvider";

const MAX_ROW_BYTES = 500_000;

// app_session_id|updatedAt already written this tab — so a reopened match shows
// as already-saved and isn't re-written.
const persisted = new Set<string>();
const keyOf = (s: DebateSession) => `${s.id}|${s.updatedAt}`;

/** Mark a session as already-persisted (called when reopening from history). */
export function markMatchPersisted(session: DebateSession): void {
  persisted.add(keyOf(session));
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function MatchSaver({ session }: { session: DebateSession }) {
  const d = useT();
  const supabase = getSupabaseBrowserClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [nextPath, setNextPath] = useState("");
  const [state, setState] = useState<SaveState>("idle");

  // Reset the saved/idle state whenever the session changes (a re-judge bumps
  // updatedAt, so keyOf changes and the match becomes re-savable).
  useEffect(() => {
    setState(persisted.has(keyOf(session)) ? "saved" : "idle");
  }, [session]);

  // After sign-in, come back to this exact page to finish saving.
  useEffect(() => {
    setNextPath(window.location.pathname + window.location.search);
  }, []);

  // Live auth state (mirrors AuthButton): onAuthStateChange emits INITIAL_SESSION
  // on subscribe and keeps userId fresh across sign-in/out (incl. other tabs),
  // and `checked` suppresses the sign-in nudge flash for already-signed-in users.
  useEffect(() => {
    if (!supabase) {
      setChecked(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setUserId(s?.user?.id ?? null);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const save = useCallback(async () => {
    if (!supabase || !userId || session.status !== "complete") return;
    setState("saving");
    const row = toMatchRow(session, userId);
    if (JSON.stringify(row).length > MAX_ROW_BYTES) {
      console.warn("[MatchSaver] match too large to save");
      setState("error");
      return;
    }
    const { error } = await supabase
      .from("matches")
      .upsert(row, { onConflict: "user_id,app_session_id" });
    if (error) {
      console.warn("[MatchSaver] save failed:", error.message);
      setState("error");
      return;
    }
    persisted.add(keyOf(session));
    setState("saved");
  }, [supabase, userId, session]);

  // Auto-save the moment a signed-in user + a completed, not-yet-saved session
  // meet. Re-judges bump updatedAt → state resets to "idle" → saved again.
  // Errors do NOT auto-loop: the user gets a visible retry button instead.
  useEffect(() => {
    if (state === "idle" && userId) void save();
  }, [state, userId, save]);

  if (!supabase || session.status !== "complete") return null;

  if (state === "saved") {
    return null;
  }

  if (!userId) {
    if (!checked) return null; // don't flash the nudge before auth resolves
    const href = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    return (
      <p className="text-center text-xs text-ink/55">
        <Link href={href} className="font-bold underline">
          {d.result.saver.signIn}
        </Link>{" "}
        {d.result.saver.signInNudge}
      </p>
    );
  }

  if (state === "error") {
    return (
      <div className="flex justify-center">
        <ArcadeButton variant="neutral-white" size="sm" onClick={save}>
          {d.result.saver.retry}
        </ArcadeButton>
      </div>
    );
  }

  // idle (for the tick before the auto-save effect fires) or actively saving.
  return (
    <p className="text-center text-xs text-ink/55" role="status">
      {d.result.saver.saving}
    </p>
  );
}
