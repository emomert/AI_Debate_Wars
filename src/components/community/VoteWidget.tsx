"use client";

/**
 * VoteWidget — the "who won?" side-vote on a shared match (docs/20). Anyone
 * can see the crowd tally; casting (or changing) a vote requires a signed-in
 * user — one vote per account, enforced server-side by the cast_vote RPC.
 * When the post includes an AI verdict, the crowd's call is shown next to it.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import type { VerdictWinner } from "@/lib/debate/debateTypes";
import type { VoteChoice, VoteTally } from "@/lib/community/types";
import { castVote } from "@/lib/community/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GamePanel } from "@/components/game/GamePanel";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

interface VoteWidgetProps {
  postId: string;
  initialTally: VoteTally;
  nameA: string;
  nameB: string;
  /** The AI verdict's winner, when the sharer included it (for the side-by-side). */
  aiWinner?: VerdictWinner | null;
}

const SEGMENT: Record<VoteChoice, string> = {
  a: "bg-arcade-blue",
  b: "bg-arcade-red",
  tie: "bg-arcade-yellow",
};

export function VoteWidget({ postId, initialTally, nameA, nameB, aiWinner }: VoteWidgetProps) {
  const d = useT();
  const t = d.community.vote;
  const supabase = getSupabaseBrowserClient();

  const [tally, setTally] = useState<VoteTally>(initialTally);
  const [myChoice, setMyChoice] = useState<VoteChoice | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [nextPath, setNextPath] = useState("");

  useEffect(() => {
    setNextPath(window.location.pathname);
  }, []);

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

  // Load the signed-in viewer's existing vote (RLS returns only their row).
  useEffect(() => {
    if (!supabase || !userId) {
      setMyChoice(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("shared_match_votes")
      .select("choice")
      .eq("post_id", postId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.choice) setMyChoice(data.choice as VoteChoice);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, postId]);

  const vote = async (choice: VoteChoice) => {
    if (!userId || busy || choice === myChoice) return;
    setBusy(true);
    setError(false);
    try {
      const fresh = await castVote(postId, choice);
      setTally(fresh);
      setMyChoice(choice);
    } catch (err) {
      console.warn("[vote] failed:", err);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const labelFor = (choice: VoteChoice): string =>
    choice === "a" ? nameA : choice === "b" ? nameB : t.tie;

  const crowdLine = (() => {
    if (tally.total === 0) return t.noVotes;
    const max = Math.max(tally.a, tally.b, tally.tie);
    const leaders = (["a", "b", "tie"] as const).filter((c) => tally[c] === max);
    if (leaders.length > 1 || leaders[0] === "tie") return t.crowdTie;
    return t.crowdSays(labelFor(leaders[0]));
  })();

  const aiLine = (() => {
    if (!aiWinner || aiWinner === "not_applicable") return null;
    if (aiWinner === "tie") return t.aiTie;
    return t.aiSaid(aiWinner === "modelA" ? nameA : nameB);
  })();

  const pct = (n: number) => (tally.total === 0 ? 0 : Math.round((n / tally.total) * 100));

  return (
    <GamePanel title={t.title} padding="md">
      <p className="text-sm text-ink/65">{t.blurb}</p>

      {/* Vote buttons */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(["a", "tie", "b"] as const).map((choice) => {
          const active = myChoice === choice;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => vote(choice)}
              disabled={!userId || busy}
              aria-pressed={active}
              className={cn(
                "rounded-card border-3 border-ink p-3 text-center font-heading text-sm font-extrabold transition",
                active
                  ? cn(
                      "shadow-hard-sm",
                      choice === "tie"
                        ? "bg-arcade-yellow text-night"
                        : choice === "a"
                          ? "bg-arcade-blue text-white"
                          : "bg-arcade-red text-white",
                    )
                  : "bg-card hover:bg-surface",
                !userId || busy ? "cursor-not-allowed opacity-60" : "",
              )}
            >
              <span className="block truncate">{labelFor(choice)}</span>
              <span className={cn("mt-1 block font-mono text-xs", active ? "" : "text-ink/50")}>
                {t.votes(tally[choice])}
              </span>
              {active ? (
                <span className="mt-1 block text-[10px] uppercase tracking-wide">
                  ★ {t.yourPick}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tally bar */}
      {tally.total > 0 ? (
        <div
          className="mt-3 flex h-4 overflow-hidden rounded-badge border-3 border-ink"
          role="img"
          aria-label={`${nameA} ${pct(tally.a)}% · ${t.tie} ${pct(tally.tie)}% · ${nameB} ${pct(tally.b)}%`}
        >
          {(["a", "tie", "b"] as const).map((c) =>
            tally[c] > 0 ? (
              <span
                key={c}
                className={SEGMENT[c]}
                style={{ width: `${(tally[c] / tally.total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      ) : null}

      {/* Crowd vs AI verdict — announce the updated tally after a vote (a11y). */}
      <div className="mt-3 space-y-1 text-sm font-semibold" aria-live="polite">
        <p>{crowdLine}</p>
        {aiLine ? <p className="text-ink/60">{aiLine}</p> : null}
      </div>

      {error ? <p role="alert" className="mt-2 text-xs font-semibold text-arcade-red">{t.error}</p> : null}

      {!userId && checked ? (
        <p className="mt-3 text-sm text-ink/55">
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="font-bold underline"
          >
            {t.signIn}
          </Link>{" "}
          {t.signInNudge}
        </p>
      ) : null}
    </GamePanel>
  );
}
