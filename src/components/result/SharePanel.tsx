"use client";

/**
 * SharePanel — share the match as an IMAGE of the verdict card (feedback #5).
 *
 * The image is drawn client-side (lib/share/verdictImage) — no backend. Users
 * can download it, copy it, share it natively (image + text via the Web Share
 * API, best on mobile), or fire per-platform share links (text + site link).
 * A short text recap copy stays available as a fallback.
 */

import { useEffect, useRef, useState } from "react";

import type { DebateSession } from "@/lib/debate/debateTypes";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { renderVerdictBlob } from "@/lib/share/verdictImage";
import { encodeSharePayload, sharePayloadFromSession } from "@/lib/share/shareLink";
import { formatCost } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LocaleProvider";

type ShareDict = ReturnType<typeof useT>["result"]["share"];

function headline(session: DebateSession, t: ShareDict): string {
  const v = session.verdict;
  const a = session.modelA.displayName;
  const b = session.modelB.displayName;
  if (v?.winner === "modelA") return t.beat(a, b);
  if (v?.winner === "modelB") return t.beat(b, a);
  if (v?.winner === "tie") return t.drawHeadline(a, b);
  return t.versus(a, b);
}

/** Short, tweet-sized text (topic clamped) for the per-platform share links. */
function buildShareText(session: DebateSession, t: ShareDict): string {
  const topic = session.topic.length > 90 ? `${session.topic.slice(0, 87)}…` : session.topic;
  return t.shareText(headline(session, t), topic);
}

/** Longer plain-text recap (clipboard fallback). */
function buildRecap(session: DebateSession, t: ShareDict): string {
  const v = session.verdict;
  return [
    t.recap.header(headline(session, t)),
    t.recap.topic(session.topic),
    t.recap.mode(session.mode, session.roundCount),
    t.recap.fighters(session.modelA.displayName, session.modelB.displayName),
    // Strip the **bold** markers the reasoning carries (plain-text clipboard).
    v ? t.recap.verdict(v.summary.replace(/\*\*/g, "")) : t.recap.noJudge,
    ...(v?.winnerArgument ? [t.recap.winningArgument(v.winnerArgument)] : []),
    t.recap.totalCost(formatCost(session.costSummary.totalCost)),
  ].join("\n");
}

type Flash = "image" | "recap" | "link" | null;

export function SharePanel({ session }: { session: DebateSession }) {
  const d = useT();
  const t = d.result.share;
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  // Render the verdict image on mount AND whenever the session changes (e.g. a
  // post-match re-judge swaps in a new session). Reset to the loading state
  // first so the action buttons never operate on the previous verdict's image.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setImgUrl(null);
    setImgError(false);
    setCanShareFiles(false);
    blobRef.current = null;
    renderVerdictBlob(session)
      .then((blob) => {
        if (cancelled) return;
        blobRef.current = blob;
        url = URL.createObjectURL(blob);
        setImgUrl(url);
        // Feature-detect native file sharing now that we have a real file.
        try {
          const file = new File([blob], "debator-verdict.png", { type: "image/png" });
          setCanShareFiles(Boolean(navigator.canShare?.({ files: [file] })));
        } catch {
          setCanShareFiles(false);
        }
      })
      .catch(() => {
        if (!cancelled) setImgError(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [session]);

  const ping = (which: Flash) => {
    setFlash(which);
    window.setTimeout(() => setFlash((f) => (f === which ? null : f)), 2000);
  };

  const download = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = "debator-verdict.png";
    a.click();
  };

  const copyImage = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      ping("image");
    } catch {
      // Clipboard image write unsupported (e.g. Firefox) — fall back to download.
      download();
    }
  };

  const shareNative = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    try {
      const file = new File([blob], "debator-verdict.png", { type: "image/png" });
      await navigator.share({
        files: [file],
        title: t.nativeTitle,
        text: buildShareText(session, t),
        url: shareUrl(),
      });
    } catch {
      /* user dismissed or share failed — no-op */
    }
  };

  const copyRecap = async () => {
    try {
      await navigator.clipboard.writeText(buildRecap(session, t));
      ping("recap");
    } catch {
      /* ignore */
    }
  };

  // Per-match share URL whose OG preview IS the verdict (auto-unfurls on social).
  const shareUrl = () =>
    `${window.location.origin}/s?d=${encodeSharePayload(sharePayloadFromSession(session))}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      ping("link");
    } catch {
      /* ignore */
    }
  };

  const openShare = (kind: "x" | "whatsapp" | "reddit" | "linkedin") => {
    const url = shareUrl();
    const text = buildShareText(session, t);
    const e = encodeURIComponent;
    const targets: Record<typeof kind, string> = {
      x: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`,
      whatsapp: `https://wa.me/?text=${e(`${text} ${url}`)}`,
      reddit: `https://www.reddit.com/submit?url=${e(url)}&title=${e(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
    };
    window.open(targets[kind], "_blank", "noopener,noreferrer");
  };

  const supportsCopyImage =
    typeof window !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    Boolean(navigator.clipboard?.write);

  return (
    <GamePanel title={t.title} padding="md">
      <p className="text-sm text-ink/65">
        {t.blurb}
      </p>

      {/* Verdict image preview */}
      <div className="mt-4 overflow-hidden rounded-card border-4 border-ink bg-paper shadow-hard-sm">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={t.previewAlt} className="block w-full" />
        ) : imgError ? (
          <p className="p-6 text-center text-sm text-ink/60">
            {t.renderError}
          </p>
        ) : (
          <p className="p-6 text-center text-sm text-ink/55">{t.drawing}</p>
        )}
      </div>

      {/* Image actions */}
      {imgUrl ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canShareFiles ? (
            <ArcadeButton variant="primary-green" onClick={shareNative}>
              {t.shareImage}
            </ArcadeButton>
          ) : null}
          <ArcadeButton variant="primary-yellow" onClick={download}>
            {t.download}
          </ArcadeButton>
          {supportsCopyImage ? (
            <ArcadeButton variant="neutral-white" onClick={copyImage}>
              {flash === "image" ? t.copied : t.copyImage}
            </ArcadeButton>
          ) : null}
        </div>
      ) : null}

      {/* Social + link */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ArcadeButton variant="neutral-white" size="sm" onClick={() => openShare("x")}>
          {t.post}
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" size="sm" onClick={() => openShare("whatsapp")}>
          {t.whatsapp}
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" size="sm" onClick={() => openShare("reddit")}>
          {t.reddit}
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" size="sm" onClick={() => openShare("linkedin")}>
          {t.linkedin}
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" size="sm" onClick={copyLink}>
          {flash === "link" ? t.linkCopied : t.copyLink}
        </ArcadeButton>
        <ArcadeButton variant="neutral-white" size="sm" onClick={copyRecap}>
          {flash === "recap" ? t.copied : t.copyRecap}
        </ArcadeButton>
      </div>

      <p className="mt-3 text-[11px] text-ink/45">
        {t.tip}
      </p>
    </GamePanel>
  );
}
