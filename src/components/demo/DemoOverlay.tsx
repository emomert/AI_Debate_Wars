"use client";

/**
 * DemoOverlay — the "See a Demo" full-screen player (docs/09). Plays a ~30s
 * REAL screen recording of the actual product (one genuine match, recorded
 * with scripts/record-demo.mjs and cut with scripts/edit-demo.mjs into
 * /public/demo/demo-match.mp4): typing the topic, picking the fighters,
 * starting the match, the rounds fast-forwarded, and the judge's verdict.
 *
 * The clip is SILENT, so it narrates itself with captions: edit-demo.mjs emits
 * /public/demo/demo-chapters.json (the real cut boundaries + the line for each
 * stretch) and we render the active line here. Keeping the text in the DOM
 * rather than burned into the pixels means it stays crisp at any size, is
 * styled by the design system, and a re-cut updates the words with the picture
 * instead of drifting from it. Captions describe English product UI, so they
 * intentionally ship with the footage rather than the locale dictionaries.
 * Missing/failed JSON just means no captions — the video still plays.
 *
 * Skippable at any moment (✕ / Skip / Esc); ends on a "Your turn." card with
 * a Use Debator CTA + Replay.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ArcadeButton } from "@/components/game/ArcadeButton";
import { playSound } from "@/lib/audio/soundManager";
import { useT } from "@/lib/i18n/LocaleProvider";

const DEMO_SRC = "/demo/demo-match.mp4";
const CHAPTERS_SRC = "/demo/demo-chapters.json";
/**
 * The community post for the match in the video — the end card links to it so
 * "Real match · recorded live" is checkable rather than just claimed. Published
 * through the normal result-page PublishPanel (public, model names + verdict
 * shown, since the footage already shows both). Empty string = no button, so a
 * re-shoot can never leave a dead link behind: re-publish, then update this.
 */
const DEMO_MATCH_ID = "P0LNlRB9eLbm";

interface Chapter {
  start: number;
  end: number;
  caption: string;
}

export function DemoOverlay({ onClose }: { onClose: () => void }) {
  const d = useT();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [caption, setCaption] = useState("");

  // Caption track ships next to the video; absent/broken = silent playback.
  useEffect(() => {
    let cancelled = false;
    void fetch(CHAPTERS_SRC)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.chapters)) setChapters(data.chapters);
      })
      .catch(() => {
        /* no captions — the demo still plays */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Esc closes; lock body scroll while open; focus lands on Close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const skip = useCallback(() => {
    videoRef.current?.pause();
    setEnded(true);
  }, []);

  const replay = useCallback(() => {
    setEnded(false);
    setProgress(0);
    setCaption("");
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play();
    }
  }, []);

  const goSetup = useCallback(() => {
    playSound("buttonClick");
    onClose();
    router.push("/setup");
  }, [onClose, router]);

  // New tab on purpose: the end card is the conversion moment, so reading the
  // transcript must not cost the viewer the "Use Debator" CTA behind it.
  const openMatch = useCallback(() => {
    window.open(`/m/${DEMO_MATCH_ID}`, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.home.demo.aria}
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/95 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* The player is ONE centered group: label/close and the progress rail are
          bound to the video frame's edges, not to the viewport. The max-width
          also clamps against viewport height (16:9 + ~9rem of rails/padding) so
          a short window shrinks the frame instead of pushing rails off screen. */}
      <div className="flex w-full max-w-[min(56rem,calc((100dvh_-_9rem)*16/9))] flex-col">
        {/* Top rail — sits just outside the frame's top edge. */}
        <div className="flex items-center justify-between gap-2 pb-2">
          <span className="rounded-badge border-3 border-ink bg-arcade-yellow px-2 py-1 font-heading text-[11px] font-extrabold uppercase tracking-wide text-night">
            {d.home.demo.watching}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={d.home.demo.close}
            className="rounded-btn border-3 border-ink bg-paper px-2.5 py-1 font-heading text-sm font-extrabold shadow-hard-sm transition hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2"
          >
            ✕
          </button>
        </div>

        {/* Stage — the real footage (16:9). */}
        <div className="relative w-full overflow-hidden rounded-modal border-4 border-ink bg-night shadow-hard-lg">
          <video
            ref={videoRef}
            src={DEMO_SRC}
            className="block aspect-video w-full"
            autoPlay
            muted
            playsInline
            onEnded={() => setEnded(true)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration > 0) setProgress(v.currentTime / v.duration);
              const active = chapters.find((c) => v.currentTime >= c.start && v.currentTime < c.end);
              setCaption(active?.caption ?? "");
            }}
          />
          {/* Caption strip — narrates the silent clip. Sits inside the frame so
              it scales with the video and never pushes the layout around. */}
          {caption && !ended ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-2 sm:p-3">
              <p
                aria-live="polite"
                className="rounded-badge border-3 border-ink bg-arcade-yellow px-3 py-1 text-center font-heading text-[11px] font-extrabold uppercase tracking-wide text-night shadow-hard-sm sm:px-4 sm:py-1.5 sm:text-sm"
              >
                {caption}
              </p>
            </div>
          ) : null}
          {ended ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-paper p-4 text-center sm:gap-3 sm:p-6">
              <p className="font-display text-2xl tracking-tight sm:text-5xl">
                {d.home.demo.yourTurn}
              </p>
              <p className="max-w-md text-xs text-ink/70 sm:text-base">{d.home.demo.yourTurnSub}</p>
              {/* Primary alone on top so the CTA keeps its weight; the proof
                  link and Replay sit beneath it as equal secondaries. */}
              <div className="mt-1 flex flex-col items-center gap-2 sm:mt-2">
                <ArcadeButton
                  variant="primary-green"
                  size="lg"
                  onClick={goSetup}
                  rightIcon={<span aria-hidden>▶</span>}
                >
                  {d.home.demo.cta}
                </ArcadeButton>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {DEMO_MATCH_ID ? (
                    <ArcadeButton variant="neutral-white" size="sm" onClick={openMatch}>
                      {d.home.demo.seeMatch}
                    </ArcadeButton>
                  ) : null}
                  <ArcadeButton variant="neutral-white" size="sm" onClick={replay}>
                    {d.home.demo.replay}
                  </ArcadeButton>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom rail — sits directly under the frame's bottom edge. */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper/20">
            <div
              className="h-full bg-arcade-yellow"
              style={{ width: `${Math.min(100, (ended ? 1 : progress) * 100)}%` }}
            />
          </div>
          {!ended ? (
            <button
              type="button"
              onClick={skip}
              className="rounded-btn border-3 border-ink bg-paper px-3 py-1 font-heading text-xs font-extrabold uppercase tracking-wide shadow-hard-sm transition hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2"
            >
              {d.home.demo.skip}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
