"use client";

/**
 * ThinkingBubble — pulsing dots + a rotating, randomized, slightly silly waiting
 * line shown while the active fighter "thinks" (docs/12). The visible line is
 * decorative and changes every few seconds so the wait never feels static; a
 * stable screen-reader label carries the real meaning (the arena's live region
 * already announces whose turn it is, so the funny text is aria-hidden).
 */

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils/cn";
import type { ModelColor } from "@/lib/debate/debateTypes";

const DOT_COLOR: Record<ModelColor, string> = {
  blue: "bg-arcade-blue",
  red: "bg-arcade-red",
  yellow: "bg-arcade-yellow",
  purple: "bg-arcade-purple",
};

// {name} is replaced with the fighter's name. Kept playful but short so they fit
// the bubble on a phone.
const FIGHTER_LINES = [
  "{name} is cooking up a hot take",
  "{name} is sharpening its arguments",
  "{name} is rehearsing the mic drop",
  "{name} is loading spicy opinions",
  "{name} is cracking its knuckles",
  "{name} is summoning a counterargument",
  "{name} is buffering brilliance",
  "{name} is choosing violence (politely)",
  "{name} is drafting a devastating rebuttal",
  "{name} is overthinking this, honestly",
  "{name} is preparing to disagree confidently",
  "{name} is consulting the vibes",
  "{name} is pacing dramatically",
  "{name} is rummaging for a comeback",
  "{name} is warming up the debate muscles",
];

const RESEARCH_LINES = [
  "🔎 {name} is digging through the archives",
  "🔎 {name} is interrogating the internet",
  "🔎 {name} is fact-checking its gut feeling",
  "🔎 {name} is speed-reading the web",
  "🔎 {name} is chasing down citations",
  "🔎 {name} is raiding the library",
  "🔎 {name} is following the footnotes",
  "🔎 {name} is cross-examining sources",
  "🔎 {name} is hunting for receipts",
];

const JUDGE_LINES = [
  "⚖️ The judge is weighing the evidence",
  "⚖️ The judge is polishing the gavel",
  "⚖️ The judge is re-reading the spicy bits",
  "⚖️ The judge is consulting the rulebook",
  "⚖️ The judge is tallying the points",
  "⚖️ The judge is deliberating dramatically",
  "⚖️ The judge is squinting at the transcript",
  "⚖️ The judge is doing the math",
];

const ROTATE_MS = 2400;

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
  const lines = useMemo(() => {
    const pool = deep ? RESEARCH_LINES : kind === "judge" ? JUDGE_LINES : FIGHTER_LINES;
    return pool.map((t) => t.replace("{name}", name));
  }, [deep, kind, name]);

  // Start at a fixed index so SSR and the first client render agree (no
  // hydration mismatch); randomize + start rotating once mounted.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const pick = () => Math.floor(Math.random() * lines.length);
    setIdx(pick());
    if (lines.length <= 1) return;
    const id = setInterval(() => {
      // Always move to a DIFFERENT line so it visibly changes each tick.
      setIdx((cur) => {
        let next = cur;
        while (next === cur) next = pick();
        return next;
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [lines]);

  const message = lines[idx] ?? lines[0];

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
        {message}…
        {deep ? (
          <span className="font-normal text-ink/55"> (this can take a while)</span>
        ) : null}
      </span>
    </div>
  );
}
