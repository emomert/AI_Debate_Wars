"use client";

/**
 * SharedTranscript — the read-only transcript on a shared match page (docs/20).
 * Mirrors the debate arena's message cards (lean left/right, accent bars,
 * citations) but renders from a sanitized SharedSnapshot: no costs, no token
 * usage, and fighters may be masked as "Fighter A / Fighter B".
 */

import type { SharedFighter, SharedSnapshot } from "@/lib/community/types";
import type { ModelColor } from "@/lib/debate/debateTypes";
import { Badge } from "@/components/game/Badge";
import { MarkdownText } from "@/components/debate/MarkdownText";
import { SourcesList } from "@/components/debate/SourcesList";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

const ACCENT_BAR: Record<ModelColor, string> = {
  blue: "bg-arcade-blue",
  red: "bg-arcade-red",
  yellow: "bg-arcade-orange",
  purple: "bg-arcade-purple",
};

export function fighterLabel(
  fighter: SharedFighter,
  side: "a" | "b",
  fallbackA: string,
  fallbackB: string,
): string {
  return fighter.name ?? (side === "a" ? fallbackA : fallbackB);
}

export function SharedTranscript({ snapshot }: { snapshot: SharedSnapshot }) {
  const d = useT();
  const t = d.community.match;

  return (
    <div className="space-y-3">
      {snapshot.messages.map((m, i) => {
        const side = m.speaker === "modelA" ? "a" : "b";
        const fighter = snapshot.fighters[side];
        const title = fighterLabel(fighter, side, t.fighterA, t.fighterB);
        const subtitle = fighter.nickname ?? (fighter.name ? undefined : t.mysterySub);
        const isB = side === "b";

        return (
          <article
            key={i}
            className={cn(
              "relative w-full max-w-[94%] overflow-hidden rounded-card border-4 border-ink bg-card shadow-hard-sm sm:max-w-[88%]",
              isB ? "ml-auto mr-1" : "mr-auto ml-1",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0 w-1.5",
                isB ? "right-0" : "left-0",
                ACCENT_BAR[fighter.color],
              )}
            />
            <div className={cn("p-3 sm:p-4", isB ? "pr-4 sm:pr-5" : "pl-4 sm:pl-5")}>
              <header className="mb-2 flex flex-wrap items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-btn border-3 border-ink bg-paper text-lg">
                  {fighter.avatar}
                </span>
                <div className="min-w-0">
                  <p className="break-words font-heading text-sm font-extrabold leading-tight sm:truncate">
                    {title}
                  </p>
                  {subtitle ? (
                    <p className="truncate text-[11px] text-ink/50">{subtitle}</p>
                  ) : null}
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {m.roundLabel ? <Badge color="white" size="sm">{m.roundLabel}</Badge> : null}
                  {m.stance ? (
                    <Badge color={m.stance === "pro" ? "blue" : "red"} size="sm">
                      {m.stance === "pro" ? d.debate.message.pro : d.debate.message.against}
                    </Badge>
                  ) : null}
                </div>
              </header>

              <MarkdownText content={m.content} citations={m.citations} />

              {m.citations && m.citations.length > 0 ? (
                <footer className="mt-3">
                  <SourcesList citations={m.citations} />
                </footer>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
