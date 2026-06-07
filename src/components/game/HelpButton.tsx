"use client";

/**
 * HelpButton — opens a playful "How to play" modal explaining the arena in a
 * few steps. Keyboard accessible (Esc to close, focus-visible rings).
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { IconButton } from "@/components/game/IconButton";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { Badge } from "@/components/game/Badge";

const STEPS: { emoji: string; title: string; body: string }[] = [
  { emoji: "📝", title: "Drop a topic", body: "Any question, claim, or idea you want stress-tested." },
  { emoji: "⚔️", title: "Pick a mode", body: "Debate Mode for opposing sides, Discussion Mode to improve an idea." },
  { emoji: "🤖", title: "Choose two fighters", body: "Select Model A and Model B like arcade characters." },
  { emoji: "🎚️", title: "Set the rules", body: "3, 5 or 7 rounds, a tone, and an optional judge." },
  { emoji: "🏆", title: "Watch & judge", body: "The arena runs the rounds and reveals a final verdict." },
];

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Portal target only exists on the client.
  useEffect(() => setMounted(true), []);

  // Lock background scroll while the modal is open (restore the prior value).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // While open: focus the dialog, trap Tab inside it, close on Escape, and
  // restore focus to the trigger on close (modal a11y).
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
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
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  return (
    <>
      {/* A real text glyph (not the ❔ emoji) so it renders in solid ink —
          emoji ignore CSS color and looked washed-out. */}
      <IconButton label="How to play" onClick={() => setOpen(true)} color="white">
        <span aria-hidden className="font-display text-[1.2em] leading-none">
          ?
        </span>
      </IconButton>

      {mounted
        ? createPortal(
            <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-night/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="How to play"
          >
            <motion.div
              ref={dialogRef}
              tabIndex={-1}
              className="w-full max-w-lg rounded-modal border-4 border-ink bg-card p-5 shadow-hard-lg outline-none sm:p-7"
              initial={{ scale: 0.9, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl font-extrabold sm:text-3xl">
                  How to Play
                </h2>
                <Badge color="yellow">Arena Rules</Badge>
              </div>

              <ol className="space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-btn border-3 border-ink bg-arcade-yellow font-mono text-sm font-bold text-night">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-heading text-base font-extrabold">
                        <span aria-hidden className="mr-1">{s.emoji}</span>
                        {s.title}
                      </p>
                      <p className="text-sm text-ink/70">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-4 rounded-card border-3 border-dashed border-ink/40 bg-paper p-3 text-xs text-ink/70">
                The arena controls the rounds — the models only speak when it's
                their turn. No endless back-and-forth.
              </p>

              <div className="mt-5 flex justify-end">
                <ArcadeButton variant="primary-green" onClick={() => setOpen(false)}>
                  Got it
                </ArcadeButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
