"use client";

/**
 * ThinkingBubble — pulsing dots + a rotating, randomized, slightly silly waiting
 * line shown while the active fighter "thinks" (docs/12), in EVERY mode. The
 * line is decorative and changes every few seconds so the wait never feels
 * static; the arena's own polite live region announces the real turn/round
 * state, so this bubble is aria-hidden (no competing live region).
 */

import { cn } from "@/lib/utils/cn";
import type { ModelColor } from "@/lib/debate/debateTypes";
import { useRotatingLine } from "@/components/debate/waitingMessages";
import { useT } from "@/lib/i18n/LocaleProvider";

const DOT_COLOR: Record<ModelColor, string> = {
  blue: "bg-arcade-blue",
  red: "bg-arcade-red",
  yellow: "bg-arcade-yellow",
  purple: "bg-arcade-purple",
};

interface ThinkingBubbleProps {
  name: string;
  color?: ModelColor;
  /** Deep Debate: show "researching the web" lines so the longer wait reads. */
  deep?: boolean;
  /** "judge" picks the verdict-flavored lines (name is ignored for those). */
  kind?: "fighter" | "judge";
}

export function ThinkingBubble({
  name,
  color = "blue",
  deep = false,
  kind = "fighter",
}: ThinkingBubbleProps) {
  const d = useT();
  const pool = deep
    ? d.debate.researchLines
    : kind === "judge"
      ? d.debate.judgeLines
      : d.debate.fighterLines;
  const message = useRotatingLine(pool, name);

  return (
    // Decorative: the arena's own polite live region (DebateArena) already
    // announces whose turn it is + the round, so the bubble must NOT add a
    // second competing aria-live region.
    <div
      aria-hidden
      className="inline-flex items-center gap-2 rounded-card border-3 border-ink bg-surface px-3 py-2 shadow-hard-sm"
    >
      <span className="flex items-end gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-2 w-2 rounded-full animate-thinking-bounce", DOT_COLOR[color])}
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      <span className="font-heading text-sm font-bold">
        {d.debate.thinking.line(message)}
        {deep ? (
          <span className="font-normal text-ink/55">{d.debate.thinking.deepSuffix}</span>
        ) : null}
      </span>
    </div>
  );
}
