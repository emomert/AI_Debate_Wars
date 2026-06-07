"use client";

/**
 * Playful "the AI is working" lines, shared by the thinking bubble (the wait
 * before text appears) and the streaming card caption (while text is typing).
 * They apply in EVERY mode — the deep-research pool is just a web-flavored
 * variant, not a gate. `{name}` is replaced with the fighter's name.
 */

import { useEffect, useMemo, useState } from "react";

// 80+ lines so the rotating thinking message rarely repeats within a match.
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
  "{name} is sharpening its rhetorical knives",
  "{name} is googling nothing — it just knows",
  "{name} is rehearsing in the mirror",
  "{name} is doing breathing exercises",
  "{name} is calculating the perfect zinger",
  "{name} is locating its inner lawyer",
  "{name} is brewing a strong argument",
  "{name} is connecting suspicious dots",
  "{name} is reading between your lines",
  "{name} is preparing receipts",
  "{name} is loading the big words",
  "{name} is steelmanning, then demolishing",
  "{name} is whispering to its training data",
  "{name} is rolling up its sleeves",
  "{name} is plotting a clean takedown",
  "{name} is consulting imaginary experts",
  "{name} is rehearsing a confident “actually…”",
  "{name} is stacking premises",
  "{name} is sniffing out a logical fallacy",
  "{name} is polishing a one-liner",
  "{name} is doing mental gymnastics (gold medal)",
  "{name} is assembling an airtight case",
  "{name} is summoning ancient wisdom",
  "{name} is preparing to win, obviously",
  "{name} is loading 200% confidence",
  "{name} is cross-referencing the universe",
  "{name} is gathering its thoughts (all of them)",
  "{name} is preparing a strategic pause",
  "{name} is warming up the sarcasm",
  "{name} is finding the weak spot",
  "{name} is building a rhetorical trap",
  "{name} is rehearsing the closing line first",
  "{name} is consulting the rulebook it ignores",
  "{name} is loading counterexamples",
  "{name} is quietly judging the other side",
  "{name} is calibrating the spice level",
  "{name} is summoning debate-club flashbacks",
  "{name} is preparing to be insufferably correct",
  "{name} is drawing a tiny mental diagram",
  "{name} is rehearsing dramatic emphasis",
  "{name} is collecting its strongest takes",
  "{name} is bracing for impact",
  "{name} is loading the “respectfully, no”",
  "{name} is searching its soul (and its weights)",
  "{name} is preparing a surgical rebuttal",
  "{name} is warming up the hot-takes oven",
  "{name} is lining up dominoes to knock down",
  "{name} is rehearsing its villain monologue",
  "{name} is consulting the court of vibes",
  "{name} is sketching the perfect analogy",
  "{name} is loading uncomfortable truths",
  "{name} is pre-gaming the rebuttal",
  "{name} is double-checking it's right (it is)",
  "{name} is preparing to gently obliterate",
  "{name} is gathering momentum",
  "{name} is finding the cleverest angle",
  "{name} is rehearsing the “let me explain”",
  "{name} is loading premium-grade logic",
  "{name} is putting on its thinking crown",
  "{name} is assembling a counterstrike",
  "{name} is queueing up the facts",
  "{name} is preparing to flip the script",
  "{name} is warming up for round-winning words",
  "{name} is doing the math on this argument",
  "{name} is sharpening the closing blow",
  "{name} is loading a confident smirk",
  "{name} is preparing to say “well, actually”",
  "{name} is marshalling the evidence",
  "{name} is rehearsing its strongest point twice",
  "{name} is getting dangerously articulate",
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
  "🔎 {name} is opening 47 browser tabs",
  "🔎 {name} is reading the fine print",
  "🔎 {name} is consulting the primary sources",
  "🔎 {name} is triangulating the facts",
  "🔎 {name} is separating signal from noise",
  "🔎 {name} is checking who said what",
  "🔎 {name} is pulling up the studies",
  "🔎 {name} is verifying before vibing",
  "🔎 {name} is sniffing out the real numbers",
  "🔎 {name} is cross-referencing the universe",
  "🔎 {name} is digging for the source behind the claim",
  "🔎 {name} is grilling the search results",
  "🔎 {name} is collecting receipts to cite",
  "🔎 {name} is weighing the evidence",
  "🔎 {name} is double-checking the date on that",
  "🔎 {name} is connecting suspicious dots",
  "🔎 {name} is building an evidence-backed case",
  "🔎 {name} is loading citations, not vibes",
  "🔎 {name} is doing actual homework",
  "🔎 {name} is hunting for a smoking gun",
  "🔎 {name} is reading past the headline",
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

const ROTATE_MS = 7400;

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
