"use client";

/**
 * Playful "the AI is working" lines, shared by the thinking bubble (the wait
 * before text appears) and the streaming card caption (while text is typing).
 * They apply in EVERY mode — the deep-research pool is just a web-flavored
 * variant, not a gate. `{name}` is replaced with the fighter's name.
 */

import { useEffect, useMemo, useState } from "react";

export const FIGHTER_LINES = [
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
] as const;

export const RESEARCH_LINES = [
  "🔎 {name} is digging through the archives",
  "🔎 {name} is interrogating the internet",
  "🔎 {name} is fact-checking its gut feeling",
  "🔎 {name} is speed-reading the web",
  "🔎 {name} is chasing down citations",
  "🔎 {name} is raiding the library",
  "🔎 {name} is following the footnotes",
  "🔎 {name} is cross-examining sources",
  "🔎 {name} is hunting for receipts",
] as const;

export const JUDGE_LINES = [
  "⚖️ The judge is weighing the evidence",
  "⚖️ The judge is polishing the gavel",
  "⚖️ The judge is re-reading the spicy bits",
  "⚖️ The judge is consulting the rulebook",
  "⚖️ The judge is tallying the points",
  "⚖️ The judge is deliberating dramatically",
  "⚖️ The judge is squinting at the transcript",
  "⚖️ The judge is doing the math",
] as const;

// Shown WHILE the answer types out (any mode).
export const WRITING_LINES = [
  "{name} is typing furiously",
  "{name} is putting it into words",
  "{name} is on a roll",
  "{name} is wording things carefully",
  "{name} is making its case",
  "{name} is hammering the keys",
  "{name} is mid-monologue",
  "{name} is laying it all out",
] as const;

const ROTATE_MS = 2400;

/**
 * Returns a randomized line from `pool` (with `{name}` filled in) that rotates
 * to a different one every `intervalMs`. SSR-safe: renders a fixed first line
 * on the server / first client paint, then randomizes after mount so there's
 * no hydration mismatch.
 */
export function useRotatingLine(
  pool: readonly string[],
  name: string,
  intervalMs = ROTATE_MS,
): string {
  const lines = useMemo(() => pool.map((t) => t.replace("{name}", name)), [pool, name]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const pick = () => Math.floor(Math.random() * lines.length);
    setIdx(pick());
    if (lines.length <= 1) return;
    const id = setInterval(() => {
      setIdx((cur) => {
        let next = cur;
        while (next === cur) next = pick();
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [lines, intervalMs]);

  return lines[idx] ?? lines[0] ?? "";
}
