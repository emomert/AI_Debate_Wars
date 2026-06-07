"use client";

/**
 * CitationViewer — a single app-wide popup for inline [n] citation chips.
 *
 * Clicking a chip in debate/verdict text opens THIS modal (instead of jumping
 * straight to the source) showing the title, domain, the quoted excerpt, and a
 * real "Open source" link. One provider mounted at the root holds the active
 * citation so every MarkdownText shares the same dialog. Components read the
 * opener via useCitationViewer(); when no provider is present the chip falls
 * back to a plain link, so MarkdownText still works in isolation.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import type { Citation } from "@/lib/debate/debateTypes";
import { Badge } from "@/components/game/Badge";
import { ArcadeButton } from "@/components/game/ArcadeButton";

interface CitationViewerValue {
  open: (citation: Citation) => void;
}

const CitationViewerContext = createContext<CitationViewerValue | null>(null);

/** Returns the opener, or null when no provider wraps this subtree. */
export function useCitationViewer(): CitationViewerValue | null {
  return useContext(CitationViewerContext);
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function CitationViewerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Citation | null>(null);
  const open = useCallback((citation: Citation) => setActive(citation), []);
  const close = useCallback(() => setActive(null), []);

  // Stable value so opening/closing the modal doesn't re-render every consumer
  // (every MarkdownText reads this context).
  const value = useMemo(() => ({ open }), [open]);

  return (
    <CitationViewerContext.Provider value={value}>
      {children}
      <CitationModal citation={active} onClose={close} />
    </CitationViewerContext.Provider>
  );
}

function CitationModal({
  citation,
  onClose,
}: {
  citation: Citation | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Lock background scroll while open so wheel/touch over the backdrop doesn't
  // scroll the debate feed behind the dialog. Restore the prior value so
  // stacked locks (if any) aren't clobbered.
  useEffect(() => {
    if (!citation) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [citation]);

  // Focus the dialog, trap Tab, close on Escape, restore focus on close.
  useEffect(() => {
    if (!citation) return;
    const citedIndex = citation.index;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Restore focus to the chip that opened the popup. If that chip's card
      // unmounted while the modal was open (a streaming turn completed and
      // re-mounted as a finished card), the saved node is detached — fall back
      // to the equivalent chip in the new card so focus never drops to <body>.
      const saved = restoreFocusRef.current;
      if (saved && saved.isConnected) {
        saved.focus?.();
      } else {
        document
          .querySelector<HTMLElement>(`[aria-label^="Source ${citedIndex}:"]`)
          ?.focus();
      }
    };
  }, [citation, onClose]);

  if (!mounted) return null;

  const domain = citation ? domainOf(citation.url) : "";
  const isHttp = citation ? /^https?:\/\//i.test(citation.url) : false;

  return createPortal(
    <AnimatePresence>
      {citation ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-night/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Source ${citation.index}`}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-modal border-4 border-ink bg-card p-5 shadow-hard-lg outline-none sm:p-6"
            initial={{ scale: 0.9, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border-3 border-ink bg-night font-mono text-sm font-bold text-arcade-yellow">
                {citation.index}
              </span>
              <Badge color="purple">📚 Source</Badge>
            </div>

            <p className="font-heading text-lg font-extrabold leading-snug">
              {citation.title}
            </p>
            {domain ? (
              <p className="mt-1">
                <Badge color="white" size="sm">{domain}</Badge>
              </p>
            ) : null}

            {citation.quote ? (
              <blockquote className="mt-3 rounded-card border-3 border-dashed border-ink/40 bg-paper p-3 text-sm text-ink/75">
                “{citation.quote}”
              </blockquote>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <ArcadeButton variant="neutral-white" onClick={onClose}>
                Close
              </ArcadeButton>
              {isHttp ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-btn border-3 border-ink bg-arcade-blue px-4 py-2 font-heading text-sm font-extrabold text-white shadow-hard-sm transition hover:-translate-y-0.5 focus-visible:outline-[3px] focus-visible:outline-offset-2"
                >
                  Open source ↗
                </a>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
