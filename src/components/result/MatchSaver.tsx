"use client";

/**
 * MatchSaver (docs/19 Phase 2). A explicit "Save to my history" button for a
 * completed match (feedback: saving should be a button, not automatic). Signed
 * out → a sign-in nudge; auth off → nothing. RLS guarantees a user only writes
 * their own rows; idempotent on the session id (a re-judge bumps updatedAt).
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toMatchRow } from "@/lib/supabase/matches";
import { ArcadeButton } from "@/components/game/ArcadeButton";

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

  if (!supabase || session.status !== "complete") return null;

  const save = async () => {
    if (!userId) return;
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
  };

  if (state === "saved") {
    return (
      <p className="text-center text-xs font-semibold text-arcade-green">
        ✓ Saved to your profile
      </p>
    );
  }

  if (!userId) {
    if (!checked) return null; // don't flash the nudge before auth resolves
    const href = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    return (
      <p className="text-center text-xs text-ink/55">
        <Link href={href} className="font-bold underline">
          Sign in
        </Link>{" "}
        to save this match to your history.
      </p>
    );
  }

  return (
    <div className="flex justify-center">
      <ArcadeButton variant="neutral-white" size="sm" onClick={save} disabled={state === "saving"}>
        {state === "saving"
          ? "Saving…"
          : state === "error"
            ? "↻ Couldn't save — retry"
            : "💾 Save to my history"}
      </ArcadeButton>
    </div>
  );
}
