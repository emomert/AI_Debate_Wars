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
import { MULTILOCALE_ENABLED } from "@/lib/i18n/config";
import { DottedBackground } from "@/components/game/DottedBackground";
import { AudioToggle } from "@/components/game/AudioToggle";
import { MotionToggle } from "@/components/game/MotionToggle";
import { HelpButton } from "@/components/game/HelpButton";
import { LanguageToggle } from "@/components/game/LanguageToggle";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { COINS_ENABLED } from "@/lib/coins/config";

// Code-split the auth widget so the Supabase SDK stays OFF every page's initial
// bundle (incl. the debate page) and never loads on deployments without auth.
const AuthButton = dynamic(
  () => import("@/components/game/AuthButton").then((m) => m.AuthButton),
  { ssr: false },
);
// Same treatment for the coin balance chip (it also pulls the Supabase SDK).
const CoinBalance = dynamic(
  () => import("@/components/coins/CoinBalance").then((m) => m.CoinBalance),
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
  /**
   * Drop the main content's top padding so the page's own sticky bar (e.g. the
   * debate HUD) sits flush under the header with no dotted-background gap.
   * Pages that opt in own their first element's spacing.
   */
  flushTop?: boolean;
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
      {/* leading-none: the emoji's line box otherwise sits below optical
          center inside the tile (owner 7/12). */}
      <span className="grid h-8 w-8 place-items-center rounded-btn border-3 border-ink bg-arcade-yellow text-base leading-none">
        <span aria-hidden className="translate-y-[0.5px]">⚔️</span>
      </span>
      <span className="hidden font-display text-lg leading-none tracking-tight sm:inline sm:text-xl">
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
  flushTop = false,
  wide = false,
  className,
}: GameShellProps) {
  const d = useT();
  return (
    <div className="relative flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-btn border-3 border-ink bg-arcade-yellow px-3 py-1.5 font-heading font-extrabold text-night focus:not-sr-only focus:absolute focus:left-4 focus:top-2"
      >
        {d.shell.skipToContent}
      </a>
      <DottedBackground />

      <header className="sticky top-0 z-30 border-b-4 border-ink bg-paper/85 backdrop-blur">
        <div
          className={cn(
            // Compact: the header is sticky and shouldn't eat reading space.
            // Fixed width on EVERY page (matching the footer) — only the main
            // content honors `wide`, so the logo/controls never shift between
            // e.g. home and setup.
            "mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6",
          )}
        >
          <nav className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label={d.shell.primaryNav}>
            <Logo />
            <Link
              href="/community"
              aria-label={d.community.nav}
              className="shrink-0 rounded-btn border-3 border-ink bg-card px-2 py-1 font-heading text-[11px] font-extrabold uppercase tracking-wide transition hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 sm:text-xs"
            >
              🏟️ <span className="hidden sm:inline">{d.community.nav}</span>
            </Link>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {headerExtras ? (
              <>
                {headerExtras}
                {/* Hairline divider between page-specific HUD and global controls. */}
                <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-ink/15 sm:block" />
              </>
            ) : null}
            {COINS_ENABLED ? <CoinBalance /> : null}
            {authEnabled ? <AuthButton /> : null}
            {MULTILOCALE_ENABLED ? <LanguageToggle /> : null}
            <MotionToggle />
            <AudioToggle />
            <HelpButton />
          </div>
        </div>
        {hud ? (
          <div
            className={cn(
              "mx-auto w-full max-w-7xl border-t-3 border-ink/10 px-4 py-2 sm:px-6",
            )}
          >
            {hud}
          </div>
        ) : null}
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={cn(
          "mx-auto w-full flex-1 px-4 sm:px-6 focus-visible:outline-none",
          flushTop ? null : "pt-6 sm:pt-10",
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
            <span aria-hidden className="text-ink/30">·</span>
            <Link href="/contact" className="transition hover:text-ink hover:underline focus-visible:outline-3 focus-visible:outline-offset-2">
              {d.legal.contact}
            </Link>
            <span aria-hidden className="text-ink/30">·</span>
            <Link href="/report" className="transition hover:text-ink hover:underline focus-visible:outline-3 focus-visible:outline-offset-2">
              {d.shell.techReport}
            </Link>
            {COINS_ENABLED ? (
              <>
                <span aria-hidden className="text-ink/30">·</span>
                <Link href="/pricing" className="transition hover:text-ink hover:underline focus-visible:outline-3 focus-visible:outline-offset-2">
                  {d.coins.pricing.title}
                </Link>
              </>
            ) : null}
          </p>
        </footer>
      )}
    </div>
  );
}
