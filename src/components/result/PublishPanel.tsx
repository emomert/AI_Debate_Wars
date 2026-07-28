"use client";

/**
 * PublishPanel — "Share to the Community Arena" (docs/20). Lets a signed-in
 * user post the FULL match (transcript included) to the community hub, with
 * three choices: show model names, include the AI verdict, and list publicly
 * vs. unlisted link. Hidden data is stripped server-side at publish time and
 * stays hidden forever (no post-vote reveal — the sharer's choice is final).
 * Republishing the same session updates the existing post (same link).
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { publishMatch } from "@/lib/community/client";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

type PublishState = "idle" | "publishing" | "published" | "error";

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-card border-3 border-ink p-3 text-left transition",
        checked ? "bg-surface" : "bg-paper",
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-surface",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-btn border-3 border-ink text-sm font-bold",
          checked ? "bg-arcade-green text-night" : "bg-card text-ink/30",
        )}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-sm font-extrabold">{label}</span>
        <span className="mt-0.5 block text-xs text-ink/55">{hint}</span>
      </span>
    </button>
  );
}

export function PublishPanel({ session }: { session: DebateSession }) {
  const d = useT();
  const t = d.community.publish;
  const supabase = getSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [nextPath, setNextPath] = useState("");

  const hasVerdict = Boolean(session.verdict);
  const [showModels, setShowModels] = useState(true);
  const [includeVerdict, setIncludeVerdict] = useState(hasVerdict);
  const [listPublic, setListPublic] = useState(true);

  const [state, setState] = useState<PublishState>("idle");
  const [postId, setPostId] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const [linkFlash, setLinkFlash] = useState(false);

  // A re-judge swaps in a new session object — make the post re-publishable.
  useEffect(() => {
    setState("idle");
  }, [session]);

  useEffect(() => {
    setNextPath(window.location.pathname + window.location.search);
  }, []);

  // Live auth state (mirrors MatchSaver): INITIAL_SESSION fires on subscribe,
  // `checked` suppresses the sign-in nudge flash for signed-in users.
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

  // Only fully completed matches can be published (the server enforces this too).
  if (!supabase || session.status !== "complete") return null;

  const publish = async () => {
    setState("publishing");
    try {
      const res = await publishMatch(session, {
        visibility: listPublic ? "public" : "unlisted",
        showModels,
        includeVerdict: includeVerdict && hasVerdict,
      });
      setPostId(res.id);
      setUpdated(res.updated);
      setState("published");
    } catch (err) {
      console.warn("[publish] failed:", err);
      setState("error");
    }
  };

  const copyLink = async () => {
    if (!postId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/m/${postId}`);
      setLinkFlash(true);
      window.setTimeout(() => setLinkFlash(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <GamePanel title={t.title} padding="md">
      <p className="text-sm text-ink/65">{t.blurb}</p>

      {!userId ? (
        checked ? (
          <p className="mt-4 text-sm text-ink/55">
            <Link
              href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
              className="font-bold underline"
            >
              {t.signIn}
            </Link>{" "}
            {t.signInNudge}
          </p>
        ) : null
      ) : (
        <>
          <div className="mt-4 space-y-2">
            <ToggleRow
              label={t.showModels.label}
              hint={t.showModels.hint}
              checked={showModels}
              onChange={setShowModels}
              disabled={state === "publishing"}
            />
            {hasVerdict ? (
              <ToggleRow
                label={t.includeVerdict.label}
                hint={t.includeVerdict.hint}
                checked={includeVerdict}
                onChange={setIncludeVerdict}
                disabled={state === "publishing"}
              />
            ) : (
              <p className="rounded-card border-3 border-dashed border-ink/30 bg-paper p-3 text-xs text-ink/55">
                {t.noVerdictHint}
              </p>
            )}
            <ToggleRow
              label={t.listPublic.label}
              hint={t.listPublic.hint}
              checked={listPublic}
              onChange={setListPublic}
              disabled={state === "publishing"}
            />
          </div>

          {state === "published" && postId ? (
            <div className="mt-4 rounded-card border-3 border-ink bg-arcade-green/20 p-3">
              <p className="font-heading text-sm font-extrabold">
                {updated ? t.updatedTitle : t.publishedTitle}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link href={`/m/${postId}`}>
                  <ArcadeButton variant="primary-green" size="sm">
                    {t.view}
                  </ArcadeButton>
                </Link>
                <ArcadeButton variant="neutral-white" size="sm" onClick={copyLink}>
                  {linkFlash ? t.linkCopied : t.copyLink}
                </ArcadeButton>
                <ArcadeButton variant="neutral-white" size="sm" onClick={publish}>
                  {t.update}
                </ArcadeButton>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ArcadeButton
                variant="primary-yellow"
                onClick={publish}
                disabled={state === "publishing"}
              >
                {state === "publishing" ? t.publishing : t.publish}
              </ArcadeButton>
              {state === "error" ? (
                <p className="text-xs font-semibold text-arcade-red">{t.error}</p>
              ) : null}
            </div>
          )}
        </>
      )}
    </GamePanel>
  );
}
