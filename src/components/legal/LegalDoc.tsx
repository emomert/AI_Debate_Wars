/**
 * LegalDoc — shared presentational layout for the Terms / Privacy pages. Pure
 * (no hooks), so it renders fine inside a Server Component; the text comes from
 * the localized dictionary slice the page passes in.
 */

import Link from "next/link";

import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";

interface LegalSection {
  heading: string;
  body: string;
}

export function LegalDoc({
  title,
  intro,
  sections,
  effective,
  reviewNote,
  backHome,
}: {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
  effective?: string;
  reviewNote?: string;
  backHome: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
      {effective ? <p className="mt-1 text-xs text-ink/50">{effective}</p> : null}
      <p className="mt-4 text-ink/75">{intro}</p>

      <div className="mt-5 space-y-3">
        {sections.map((s) => (
          <GamePanel key={s.heading} title={s.heading}>
            <p className="text-sm leading-relaxed text-ink/80">{s.body}</p>
          </GamePanel>
        ))}
      </div>

      {reviewNote ? (
        <p className="mt-5 rounded-card border-3 border-dashed border-ink/40 bg-paper p-3 text-xs text-ink/55">
          {reviewNote}
        </p>
      ) : null}

      <div className="mt-5">
        <Link href="/">
          <ArcadeButton variant="neutral-white" size="sm">
            {backHome}
          </ArcadeButton>
        </Link>
      </div>
    </div>
  );
}
