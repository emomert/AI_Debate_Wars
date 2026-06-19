"use client";

/**
 * CommentsSection — flat comments under a shared match (docs/20). Reading is
 * open to everyone (the server passes the initial list); posting requires a
 * signed-in user. A comment can be deleted by its author or by the post owner
 * (RLS enforces both), with the same two-step inline confirm used in history.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import type { SharedComment } from "@/lib/community/types";
import { addComment } from "@/lib/community/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { ReportButton } from "@/components/community/ReportButton";
import { useT } from "@/lib/i18n/LocaleProvider";

const MAX_CHARS = 500;

interface CommentsSectionProps {
  postId: string;
  initialComments: SharedComment[];
  /** The shared match's owner — may delete any comment under their post. */
  postOwnerId: string;
}

function DeleteCommentButton({
  commentId,
  onDeleted,
}: {
  commentId: string;
  onDeleted: () => void;
}) {
  const d = useT();
  const t = d.community.comments;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const del = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase
      .from("shared_match_comments")
      .delete()
      .eq("id", commentId);
    setBusy(false);
    if (error) {
      console.warn("[comments] delete failed:", error.message);
      return;
    }
    onDeleted();
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <ArcadeButton size="sm" variant="danger-red" onClick={del} disabled={busy}>
          {busy ? t.deleting : t.confirmDelete}
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
      aria-label={t.deleteAria}
    >
      🗑
    </ArcadeButton>
  );
}

export function CommentsSection({
  postId,
  initialComments,
  postOwnerId,
}: CommentsSectionProps) {
  const d = useT();
  const t = d.community.comments;
  const supabase = getSupabaseBrowserClient();

  const [comments, setComments] = useState<SharedComment[]>(initialComments);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [me, setMe] = useState<{ username: string | null; avatar: string | null }>({
    username: null,
    avatar: null,
  });
  const [text, setText] = useState("");
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

  // The viewer's own identity, so a freshly posted comment shows their handle.
  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("username, avatar")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setMe({ username: data.username, avatar: data.avatar });
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const post = async () => {
    const body = text.trim();
    if (!userId || busy || body.length === 0 || body.length > MAX_CHARS) return;
    setBusy(true);
    setError(false);
    try {
      const res = await addComment(postId, body);
      setComments((prev) => [
        ...prev,
        {
          id: res.id,
          user_id: userId,
          body,
          created_at: res.createdAt,
          username: me.username,
          avatar: me.avatar,
        },
      ]);
      setText("");
    } catch (err) {
      console.warn("[comments] post failed:", err);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePanel title={t.title(comments.length)} padding="md">
      {comments.length === 0 ? (
        <p className="text-sm text-ink/55">{t.empty}</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-2 rounded-card border-3 border-ink bg-surface p-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-btn border-3 border-ink bg-paper text-lg">
                {c.avatar ?? "🥊"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className="font-heading font-extrabold">
                    {c.username ?? d.community.anonymous}
                  </span>
                  <span className="text-ink/40">{c.created_at.slice(0, 10)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
                {userId && userId !== c.user_id ? (
                  <div className="mt-1.5">
                    <ReportButton postId={postId} commentId={c.id} />
                  </div>
                ) : null}
              </div>
              {userId && (userId === c.user_id || userId === postOwnerId) ? (
                <DeleteCommentButton
                  commentId={c.id}
                  onDeleted={() =>
                    setComments((prev) => prev.filter((x) => x.id !== c.id))
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* Composer */}
      {userId ? (
        <div className="mt-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder={t.placeholder}
            rows={3}
            className="w-full resize-y rounded-card border-3 border-ink bg-paper p-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
          />
          <div className="mt-2 flex items-center gap-2">
            <ArcadeButton
              variant="primary-green"
              size="sm"
              onClick={post}
              disabled={busy || text.trim().length === 0}
            >
              {busy ? t.posting : t.post}
            </ArcadeButton>
            <span className="font-mono text-[11px] text-ink/45">
              {t.counter(text.length, MAX_CHARS)}
            </span>
            {error ? (
              <span className="text-xs font-semibold text-arcade-red">{t.error}</span>
            ) : null}
          </div>
        </div>
      ) : checked ? (
        <p className="mt-4 text-sm text-ink/55">
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
