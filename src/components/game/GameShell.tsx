"use client";

/**
 * GameShell — the global page shell (docs/02_DESIGN.md, docs/03_ARCHITECTURE.md).
 * Provides the dotted background, a top HUD bar (logo + sound/help controls),
 * a responsive max-width container, and a slot for page-specific HUD content.
 */

import Link from "next/link";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/LocaleProvider";
import { DottedBackground } from "@/components/game/DottedBackground";
import { SoundToggle } from "@/components/game/SoundToggle";
import { MusicToggle } from "@/components/game/MusicToggle";
import { HelpButton } from "@/components/game/HelpButton";
import { LanguageToggle } from "@/components/game/LanguageToggle";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Code-split the auth widget so the Supabase SDK stays OFF every page's initial
// bundle (incl. the debate page) and never loads on deployments without auth.
const AuthButton = dynamic(
  () => import("@/components/game/AuthButton").then((m) => m.AuthButton),
  { ssr: false },
);
const authEnabled = isSupabaseConfigured();

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
  const d = useT();
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2 rounded-btn focus-visible:outline-3 focus-visible:outline-offset-2"
      aria-label={d.shell.homeAria}
    >
      <span className="grid h-8 w-8 place-items-center rounded-btn border-3 border-ink bg-arcade-yellow text-base">
        ⚔️
      </span>
      <span className="font-display text-lg leading-none tracking-tight sm:text-xl">
        {d.common.brand}
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
  const d = useT();
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
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Logo />
            <Link
              href="/report"
              className="hidden items-center gap-1 rounded-btn border-3 border-ink bg-surface px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide transition hover:bg-arcade-yellow hover:text-night focus-visible:outline-3 focus-visible:outline-offset-2 sm:inline-flex"
            >
              📊 {d.shell.techReport}
            </Link>
            <Link
              href="/report"
              aria-label={d.shell.techReportAria}
              className="inline-flex h-8 w-8 items-center justify-center rounded-btn border-3 border-ink bg-surface text-sm transition hover:bg-arcade-yellow focus-visible:outline-3 focus-visible:outline-offset-2 sm:hidden"
            >
              📊
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {headerExtras}
            {authEnabled ? <AuthButton /> : null}
            <LanguageToggle />
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
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <Link href="/about" className="transition hover:text-ink hover:underline focus-visible:outline-3 focus-visible:outline-offset-2">
              {d.legal.about}
            </Link>
            <span aria-hidden className="text-ink/30">·</span>
            <Link href="/terms" className="transition hover:text-ink hover:underline focus-visible:outline-3 focus-visible:outline-offset-2">
              {d.legal.terms}
            </Link>
            <span aria-hidden className="text-ink/30">·</span>
            <Link href="/privacy" className="transition hover:text-ink hover:underline focus-visible:outline-3 focus-visible:outline-offset-2">
              {d.legal.privacy}
            </Link>
          </p>
        </footer>
      )}
    </div>
  );
}
