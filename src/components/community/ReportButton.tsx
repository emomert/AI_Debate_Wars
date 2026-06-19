"use client";

/**
 * ReportButton — flag a shared match (no commentId) or a comment for review
 * (P0-8). One-click preset reasons → POST /api/community/report. Reporting needs
 * a signed-in account; an AUTH_REQUIRED response swaps to a sign-in link.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { reportContent } from "@/lib/community/client";
import { ProviderError } from "@/lib/utils/errors";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

const REASONS = ["hate", "harassment", "sexual", "violence", "spam", "other"] as const;
type Reason = (typeof REASONS)[number];

type Phase = "idle" | "open" | "sending" | "done" | "auth" | "error";

interface ReportButtonProps {
  postId: string;
  /** Set to report a specific comment; omit for a match-level report. */
  commentId?: string;
  className?: string;
}

export function ReportButton({ postId, commentId, className }: ReportButtonProps) {
  const d = useT();
  const t = d.community.report;
  const [phase, setPhase] = useState<Phase>("idle");
  const [nextPath, setNextPath] = useState("");

  useEffect(() => setNextPath(window.location.pathname), []);

  const submit = async (reason: Reason) => {
    setPhase("sending");
    try {
      await reportContent(postId, reason, commentId);
      setPhase("done");
    } catch (err) {
      const code = err instanceof ProviderError ? err.code : "UNKNOWN_ERROR";
      setPhase(code === "AUTH_REQUIRED" ? "auth" : "error");
    }
  };

  if (phase === "done") {
    return (
      <span className={cn("text-[11px] font-bold text-arcade-green", className)}>
        {t.thanks}
      </span>
    );
  }

  if (phase === "auth") {
    return (
      <Link
        href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
        className={cn("text-[11px] font-bold underline", className)}
      >
        {t.signIn}
      </Link>
    );
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase("open")}
        aria-label={t.ariaLabel}
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[11px] font-bold text-ink/45 transition hover:text-arcade-red focus-visible:outline-3 focus-visible:outline-offset-2",
          className,
        )}
      >
        <span aria-hidden>⚐</span>
        {t.cta}
      </button>
    );
  }

  // open / sending / error → preset reason chips (one-click submit).
  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className="font-mono text-[11px] font-bold text-ink/55">
        {phase === "sending" ? t.sending : phase === "error" ? t.error : t.prompt}
      </span>
      {REASONS.map((r) => (
        <button
          key={r}
          type="button"
          disabled={phase === "sending"}
          onClick={() => submit(r)}
          className="rounded-[6px] border-2 border-ink bg-surface px-1.5 py-0.5 text-[11px] font-bold transition hover:bg-arcade-red hover:text-white disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2"
        >
          {t.reasons[r]}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setPhase("idle")}
        disabled={phase === "sending"}
        className="text-[11px] font-bold text-ink/45 underline disabled:opacity-50"
      >
        {t.cancel}
      </button>
    </div>
  );
}
