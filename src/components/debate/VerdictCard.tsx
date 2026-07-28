"use client";

/**
 * VerdictCard — the dramatic final reveal, now the ONE closing card (owner
 * feedback: the separate verdict / share / change-judge blocks confused users).
 * Top to bottom: the question, who argued which side, the winner + reasoning +
 * tug-of-war score, then a footer with the judge (+ inline "Change the judge")
 * and the share row (X / WhatsApp / Reddit logos, copy link, copy image, and
 * "Share match" — the full transcript + verdict as text, no save required).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { DebateSession, DebateVerdict } from "@/lib/debate/debateTypes";
import type { ProviderAvailability } from "@/lib/state/ArenaContext";
import { Badge } from "@/components/game/Badge";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { BrandLogo } from "@/components/report/BrandLogo";
import { CostBadge } from "@/components/debate/CostBadge";
import { COST_UI_ENABLED } from "@/lib/cost/uiConfig";
import { MarkdownText } from "@/components/debate/MarkdownText";
import { ScoreBreakdown } from "@/components/result/ScoreBreakdown";
import { RejudgeSection } from "@/components/result/RejudgePanel";
import { XIcon, InstagramIcon, RedditIcon } from "@/components/result/ShareIcons";
import { isDebateComplete } from "@/lib/debate/orchestrator";
import { getModelById } from "@/lib/models/modelRegistry";
import { encodeSharePayload, sharePayloadFromSession } from "@/lib/share/shareLink";
import { buildMatchShareText } from "@/lib/share/matchText";
import { publishMatch } from "@/lib/community/client";
import { renderVerdictBlob } from "@/lib/share/verdictImage";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

interface VerdictCardProps {
  session: DebateSession;
  /** The verdict to display (the runner can hold a fresher one than `session`). */
  verdict: DebateVerdict;
  /** Enable the inline "Change the judge" flow (needs a complete transcript). */
  availability?: ProviderAvailability | null;
  onSession?: (session: DebateSession) => void;
}

/** Resolve a model id to a friendly display name. */
function modelDisplayName(id: string): string {
  return getModelById(id)?.displayName ?? id;
}

type Flash = "image" | "matchLink" | "matchText" | null;

/**
 * Every label shares one grid cell, so the button is always as wide as the
 * WIDEST label — flipping to a "copied"/"busy" state never reflows the row
 * (owner feedback: the button used to jump to the next line).
 */
function ReservedLabel({ active, labels }: { active: string; labels: string[] }) {
  return (
    <span className="grid text-center">
      {labels.map((l) => (
        <span key={l} className={cn("col-start-1 row-start-1", l !== active && "invisible")}>
          {l}
        </span>
      ))}
    </span>
  );
}

/** App-icon-style share tile: brand-colored background, white glyph. */
const BRAND_TILE =
  "grid h-10 w-10 place-items-center rounded-btn border-3 border-ink text-white shadow-hard-sm transition hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2";

const INSTAGRAM_GRADIENT =
  "radial-gradient(115% 115% at 20% 105%, #FEDA75 0%, #FA7E1E 30%, #D62976 55%, #962FBF 78%, #4F5BD5 100%)";

export function VerdictCard({ session, verdict, availability, onSession }: VerdictCardProps) {
  const reduce = useReducedMotion();
  const d = useT();
  const t = d.result.share;
  const [rejudgeOpen, setRejudgeOpen] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [sharingMatch, setSharingMatch] = useState(false);

  const nameA = session.modelA.displayName;
  const nameB = session.modelB.displayName;
  const brandA = getModelById(session.modelA.modelId)?.brand ?? "";
  const brandB = getModelById(session.modelB.modelId)?.brand ?? "";
  const debate = session.mode === "debate";
  const canRejudge = Boolean(onSession) && isDebateComplete(session);

  // Every verdict this session has ever had, oldest first, with the LIVE
  // `verdict` prop last — it can be fresher than `session.verdict` during the
  // live reveal (see the `shareSession` note below), so it — not
  // `session.verdict` — is the one appended.
  const verdictList = useMemo(
    () => [...(session.pastVerdicts ?? []), verdict],
    [session.pastVerdicts, verdict],
  );

  // Selecting a judge tab. Defaults to (and snaps back to) the latest verdict
  // whenever the list grows — e.g. a fresh re-judge landing.
  const [selectedIndex, setSelectedIndex] = useState(verdictList.length - 1);
  useEffect(() => {
    setSelectedIndex(verdictList.length - 1);
    // Only the LENGTH matters here — a new verdict always means a longer list,
    // and re-selecting on every list re-creation (e.g. a fresh array with the
    // same entries) would fight the user's manual tab picks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdictList.length]);
  const selectedVerdict = verdictList[selectedIndex] ?? verdict;

  // Disambiguate tabs when the same judge appears more than once.
  const tabLabels = useMemo(() => {
    const total = new Map<string, number>();
    for (const v of verdictList) {
      const name = modelDisplayName(v.judgeModelId);
      total.set(name, (total.get(name) ?? 0) + 1);
    }
    const seen = new Map<string, number>();
    return verdictList.map((v) => {
      const name = modelDisplayName(v.judgeModelId);
      if ((total.get(name) ?? 0) <= 1) return name;
      const n = (seen.get(name) ?? 0) + 1;
      seen.set(name, n);
      return `${name} #${n}`;
    });
  }, [verdictList]);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const onTabsKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const count = verdictList.length;
    let next = selectedIndex;
    if (e.key === "ArrowLeft") next = (selectedIndex - 1 + count) % count;
    else if (e.key === "ArrowRight") next = (selectedIndex + 1) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    setSelectedIndex(next);
    tabRefs.current[next]?.focus();
  };

  const judgeName = modelDisplayName(selectedVerdict.judgeModelId);

  // Everything shared reflects the SELECTED verdict — during the live reveal
  // the runner can hold a verdict the persisted session doesn't yet, and after
  // a re-judge the user may be looking at an earlier tab.
  const shareSession: DebateSession =
    session.verdict === selectedVerdict ? session : { ...session, verdict: selectedVerdict };

  const winnerBadgeText = (() => {
    switch (selectedVerdict.winner) {
      case "modelA":
        return d.result.verdict.winnerBadge(nameA);
      case "modelB":
        return d.result.verdict.winnerBadge(nameB);
      case "tie":
        return d.result.verdict.drawBadge;
      default:
        return null;
    }
  })();

  const headline =
    selectedVerdict.winner === "modelA"
      ? t.beat(nameA, nameB)
      : selectedVerdict.winner === "modelB"
        ? t.beat(nameB, nameA)
        : selectedVerdict.winner === "tie"
          ? t.drawHeadline(nameA, nameB)
          : t.versus(nameA, nameB);

  const ping = (which: Flash) => {
    setFlash(which);
    window.setTimeout(() => setFlash((f) => (f === which ? null : f)), 2000);
  };

  // Stateless verdict-preview URL — used by the X/Reddit intents, whose OG
  // unfurl IS the verdict card.
  const shareUrl = () =>
    `${window.location.origin}/s?d=${encodeSharePayload(sharePayloadFromSession(shareSession))}`;

  // "Share match": publish an UNLISTED community copy (full transcript +
  // verdict at /m/<id> — link-only, never listed publicly; republishing the
  // same session updates the same post) and copy that short link. Signed-out /
  // publish-rejected sessions fall back to copying the whole match as text so
  // sharing still works.
  const shareMatch = async () => {
    if (sharingMatch) return;
    setSharingMatch(true);
    try {
      const res = await publishMatch(shareSession, {
        visibility: "unlisted",
        showModels: true,
        includeVerdict: true,
      });
      await navigator.clipboard.writeText(`${window.location.origin}/m/${res.id}`);
      ping("matchLink");
    } catch {
      try {
        const text = buildMatchShareText(shareSession, headline, judgeName, t.matchText);
        await navigator.clipboard.writeText(text);
        ping("matchText");
      } catch {
        /* ignore */
      }
    } finally {
      setSharingMatch(false);
    }
  };

  // Rendered lazily on click; the Promise-valued ClipboardItem keeps the write
  // inside the user gesture (Safari requirement). Fallbacks: await-then-write,
  // then a silent PNG download so the user still gets the image.
  const copyImage = async () => {
    try {
      const item = new ClipboardItem({ "image/png": renderVerdictBlob(shareSession) });
      await navigator.clipboard.write([item]);
      ping("image");
      return;
    } catch {
      /* fall through */
    }
    try {
      const blob = await renderVerdictBlob(shareSession);
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        ping("image");
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "debator-verdict.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* image render failed — nothing to share */
    }
  };

  const shareCaption = () => {
    const topic =
      session.topic.length > 90 ? `${session.topic.slice(0, 87)}…` : session.topic;
    return t.shareText(headline, topic);
  };

  const openShare = (kind: "x" | "reddit") => {
    playSound("buttonClick");
    const url = shareUrl();
    const text = shareCaption();
    const e = encodeURIComponent;
    const targets: Record<typeof kind, string> = {
      x: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`,
      reddit: `https://www.reddit.com/submit?url=${e(url)}&title=${e(text)}`,
    };
    window.open(targets[kind], "_blank", "noopener,noreferrer");
  };

  // Instagram has no web share intent — copy a ready caption, then open it.
  const openInstagram = async () => {
    playSound("buttonClick");
    try {
      await navigator.clipboard.writeText(shareCaption());
    } catch {
      /* caption copy is best-effort */
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const supportsCopyImage =
    typeof window !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    Boolean(navigator.clipboard?.write);

  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-panel border-4 border-ink bg-arcade-purple p-1 shadow-hard-lg"
    >
      <div className="rounded-[20px] border-3 border-ink bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <motion.h2
            initial={reduce ? false : { rotate: -3, scale: 0.9 }}
            animate={{ rotate: -2, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 12 }}
            className="inline-block rounded-btn border-3 border-ink bg-arcade-yellow px-3 py-1 font-display text-3xl tracking-tight text-night sm:text-4xl"
            // Announce the verdict reveal to screen readers. Scoped to this
            // static-text badge (not the whole card) so switching judge tabs
            // below — which only changes local state, not this text — never
            // re-triggers the live region.
            role="status"
            aria-live="polite"
          >
            {d.result.verdict.badge}
          </motion.h2>

          {winnerBadgeText ? (
            <motion.div
              initial={reduce ? false : { rotate: 3, scale: 0.9 }}
              animate={{ rotate: 2, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 12 }}
              className="inline-block min-w-0 max-w-full break-words rounded-btn border-3 border-ink bg-arcade-green px-3 py-1 font-display text-2xl tracking-tight text-night sm:text-3xl"
            >
              {winnerBadgeText}
            </motion.div>
          ) : null}
        </div>

        {verdictList.length > 1 ? (
          <div
            role="tablist"
            aria-label={d.result.verdict.judgeTabsLabel}
            onKeyDown={onTabsKeyDown}
            className="mt-3 flex flex-wrap gap-2"
          >
            {verdictList.map((v, i) => {
              const active = i === selectedIndex;
              const isLatest = i === verdictList.length - 1;
              return (
                <button
                  key={`${v.judgeModelId}-${i}`}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`verdict-tab-${i}`}
                  aria-selected={active}
                  aria-controls="verdict-panel"
                  tabIndex={active ? 0 : -1}
                  onClick={() => setSelectedIndex(i)}
                  className={cn(
                    "rounded-btn border-3 border-ink px-3 py-1.5 font-heading text-xs font-extrabold uppercase tracking-wide transition focus-visible:outline-3 focus-visible:outline-offset-2",
                    active
                      ? "bg-arcade-blue text-white shadow-hard-sm"
                      : "bg-surface text-ink hover:-translate-y-0.5",
                  )}
                >
                  {tabLabels[i]}
                  {isLatest ? (
                    <span className="ml-1 text-[10px] font-bold opacity-70">
                      {d.result.verdict.latestTag}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* The question + who argued which side — one compact strip. */}
        <div className="mt-4 rounded-card border-3 border-ink bg-paper p-3">
          <p className="font-heading text-base font-extrabold">{session.topic}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="rounded-badge border-2 border-ink bg-arcade-blue px-1.5 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wide text-white">
                {debate ? d.result.verdict.sideFor : d.result.verdict.sideA}
              </span>
              <BrandLogo brand={brandA} size={16} />
              <span className="truncate text-sm font-bold">{nameA}</span>
            </span>
            <span className="text-xs font-bold text-ink/40">vs</span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className="rounded-badge border-2 border-ink bg-arcade-red px-1.5 py-0.5 text-[10px] font-heading font-extrabold uppercase tracking-wide text-white">
                {debate ? d.result.verdict.sideAgainst : d.result.verdict.sideB}
              </span>
              <BrandLogo brand={brandB} size={16} />
              <span className="truncate text-sm font-bold">{nameB}</span>
            </span>
          </div>
        </div>

        {/* Everything below renders from the SELECTED judge tab. */}
        <div
          id="verdict-panel"
          role={verdictList.length > 1 ? "tabpanel" : undefined}
          aria-labelledby={verdictList.length > 1 ? `verdict-tab-${selectedIndex}` : undefined}
        >
          {selectedVerdict.winnerArgument ? (
            <p className="mt-4 text-sm text-ink/80 sm:text-base">
              <span className="font-bold">{d.result.verdict.winningArgument}</span>
              {selectedVerdict.winnerArgument}
            </p>
          ) : null}

          {/* Why the judge decided this way (leans to the winner; **bold** the
              decisive points). */}
          <div className="mt-3 rounded-card border-3 border-ink bg-surface p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink/45">
              {d.result.verdict.whyThis}
            </p>
            <MarkdownText content={selectedVerdict.summary} />
          </div>

          {selectedVerdict.scoreModelA !== undefined ? (
            <div className="mt-4">
              <ScoreBreakdown
                nameA={nameA}
                nameB={nameB}
                scoreA={selectedVerdict.scoreModelA}
                scoreB={selectedVerdict.scoreModelB}
              />
            </div>
          ) : null}

          {COST_UI_ENABLED ? (
            <div className="mt-4">
              <CostBadge
                cost={selectedVerdict.cost}
                usage={selectedVerdict.usage}
                latencyMs={selectedVerdict.latencyMs}
              />
            </div>
          ) : null}
        </div>

        {/* Footer: the judge (+ change it in place) and the share row. */}
        <div className="mt-5 border-t-3 border-ink/10 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge color="purple">{d.result.verdict.judge(judgeName)}</Badge>
            {canRejudge ? (
              <ArcadeButton
                variant="neutral-white"
                size="sm"
                onClick={() => setRejudgeOpen((v) => !v)}
                aria-expanded={rejudgeOpen}
              >
                {rejudgeOpen ? d.result.rejudge.close : d.result.verdict.changeJudge}
              </ArcadeButton>
            ) : null}
          </div>

          {rejudgeOpen && canRejudge && onSession ? (
            <div className="mt-3 rounded-card border-3 border-ink bg-paper p-3">
              <RejudgeSection
                session={session}
                availability={availability}
                onSession={onSession}
                onDone={() => setRejudgeOpen(false)}
              />
            </div>
          ) : null}

          {/* Social tiles left; Copy image + Share match on the RIGHT so they
              stack under the Change-the-judge button (owner 7/12). */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openShare("x")}
                aria-label={t.post}
                title={t.post}
                className={cn(BRAND_TILE, "bg-night")}
              >
                <XIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => void openInstagram()}
                aria-label={t.instagram}
                title={t.instagram}
                className={BRAND_TILE}
                style={{ background: INSTAGRAM_GRADIENT }}
              >
                <InstagramIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => openShare("reddit")}
                aria-label={t.reddit}
                title={t.reddit}
                className={BRAND_TILE}
                style={{ background: "#FF4500" }}
              >
                <RedditIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {supportsCopyImage ? (
                <ArcadeButton variant="neutral-white" size="sm" onClick={copyImage}>
                  <ReservedLabel
                    active={flash === "image" ? t.copied : t.copyImage}
                    labels={[t.copyImage, t.copied]}
                  />
                </ArcadeButton>
              ) : null}
              <ArcadeButton
                variant="neutral-white"
                size="sm"
                onClick={shareMatch}
                disabled={sharingMatch}
                title={t.shareMatchTitle}
              >
                <ReservedLabel
                  active={
                    flash === "matchLink"
                      ? t.linkCopied
                      : flash === "matchText"
                        ? t.matchCopied
                        : sharingMatch
                          ? t.sharing
                          : t.shareMatch
                  }
                  labels={[t.shareMatch, t.sharing, t.linkCopied, t.matchCopied]}
                />
              </ArcadeButton>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
