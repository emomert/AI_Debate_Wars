"use client";

/**
 * GameShell — the global page shell (docs/02_DESIGN.md, docs/03_ARCHITECTURE.md).
 * Provides the dotted background, a top HUD bar (logo + sound/help controls),
 * a responsive max-width container, and a slot for page-specific HUD content.
 */

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { DottedBackground } from "@/components/game/DottedBackground";
import { SoundToggle } from "@/components/game/SoundToggle";
import { MusicToggle } from "@/components/game/MusicToggle";
import { ThemeToggle } from "@/components/game/ThemeToggle";
import { HelpButton } from "@/components/game/HelpButton";

interface GameShellProps {
  children: ReactNode;
  /** Extra controls rendered in the top-right HUD, before sound/help. */
  headerExtras?: ReactNode;
  /**
   * Page-specific HUD bar rendered under the header (e.g. round counter).
   * NOTE: currently unused — pages that adopt it must not also rely on the
   * fixed 52px header height baked into sticky offsets (DebateHUD top-[52px],
   * DebateArena top-[112px], setup top-[72px]).
   */
  hud?: ReactNode;
  /**
   * Hide the global footer — used on the debate page, where the sticky bottom
   * controls bar would otherwise get pushed up on top of the footer when the
   * user scrolls to the end of the page.
   */
  hideFooter?: boolean;
  wide?: boolean;
  className?: string;
}

function Logo() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2 rounded-btn focus-visible:outline-3 focus-visible:outline-offset-2"
      aria-label="Debator — home"
    >
      <span className="grid h-8 w-8 place-items-center rounded-btn border-3 border-ink bg-arcade-yellow text-base shadow-hard-sm">
        ⚔️
      </span>
      <span className="font-display text-lg leading-none tracking-tight sm:text-xl">
        DEBATOR
      </span>
    </Link>
  );
}

export function GameShell({
  children,
  headerExtras,
  hud,
  hideFooter = false,
  wide = false,
  className,
}: GameShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <DottedBackground />

      <header className="sticky top-0 z-30 border-b-4 border-ink bg-paper/85 backdrop-blur">
        <div
          className={cn(
            // Compact: the header is sticky and shouldn't eat reading space.
            "mx-auto flex w-full items-center justify-between gap-3 px-4 py-1.5 sm:px-6",
            wide ? "max-w-7xl" : "max-w-5xl",
          )}
        >
          <Logo />
          <div className="flex items-center gap-2">
            {headerExtras}
            <ThemeToggle />
            <MusicToggle />
            <SoundToggle />
            <HelpButton />
          </div>
        </div>
        {hud ? (
          <div
            className={cn(
              "mx-auto w-full border-t-3 border-ink/10 px-4 py-2 sm:px-6",
              wide ? "max-w-7xl" : "max-w-5xl",
            )}
          >
            {hud}
          </div>
        ) : null}
      </header>

      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 pt-6 sm:px-6 sm:pt-10",
          // With the footer hidden (debate page) the sticky bottom controls
          // dock flush with the page end — no bottom padding gap beneath them.
          hideFooter ? "pb-0" : "pb-6 sm:pb-10",
          wide ? "max-w-7xl" : "max-w-5xl",
          className,
        )}
      >
        {children}
      </main>

      {hideFooter ? null : (
        <footer className="mx-auto w-full max-w-7xl px-4 py-6 text-center text-xs text-ink/50 sm:px-6">
          Debator · Arcade interface, serious intelligence.
        </footer>
      )}
    </div>
  );
}
