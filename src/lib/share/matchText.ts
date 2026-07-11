/**
 * "Share match" text — the FULL match as plain text (topic, sides, every
 * fighter turn, and the verdict), built for the clipboard. This is the
 * transcript-carrying sibling of the stateless share LINK, which only fits the
 * verdict essentials in a URL. Pure and dictionary-driven so both locales (and
 * the tests) feed their own strings.
 */

import type { DebateSession } from "@/lib/debate/debateTypes";

/** The `result.share.matchText` dictionary subtree (see dictionaries/en/result). */
export interface MatchTextStrings {
  header: (headline: string) => string;
  topic: (topic: string) => string;
  /** Debate-mode side line — A argues FOR the topic, B argues AGAINST. */
  sides: (a: string, b: string) => string;
  /** Fallback pairing line for non-debate (legacy discussion) sessions. */
  fighters: (a: string, b: string) => string;
  turnHeading: (name: string, roundLabel?: string) => string;
  verdictHeading: (judgeName: string) => string;
  noJudge: string;
  winnerLine: (name: string) => string;
  drawLine: string;
  scoreLine: (a: number, b: number) => string;
  linkLine: (url: string) => string;
}

/** Strip the markdown **bold** markers the models emit (plain-text clipboard). */
function plain(text: string): string {
  return text.replace(/\*\*/g, "").trim();
}

export function buildMatchShareText(
  session: DebateSession,
  headline: string,
  judgeName: string,
  t: MatchTextStrings,
  url?: string,
): string {
  const a = session.modelA.displayName;
  const b = session.modelB.displayName;

  const lines: string[] = [
    t.header(headline),
    t.topic(session.topic),
    session.mode === "debate" ? t.sides(a, b) : t.fighters(a, b),
  ];

  // Fighter turns only — the verdict is rendered as its own block below, and
  // errored turns carry no argument worth sharing.
  for (const m of session.messages) {
    if (m.speaker !== "modelA" && m.speaker !== "modelB") continue;
    if (m.status === "error" || m.content.trim() === "") continue;
    const name = m.speaker === "modelA" ? a : b;
    lines.push("", t.turnHeading(name, m.roundLabel), plain(m.content));
  }

  const v = session.verdict;
  lines.push("");
  if (v) {
    lines.push(t.verdictHeading(judgeName), plain(v.summary));
    const outcome =
      v.winner === "modelA"
        ? t.winnerLine(a)
        : v.winner === "modelB"
          ? t.winnerLine(b)
          : v.winner === "tie"
            ? t.drawLine
            : null;
    const score =
      v.scoreModelA !== undefined && v.scoreModelB !== undefined
        ? t.scoreLine(v.scoreModelA, v.scoreModelB)
        : null;
    if (outcome || score) lines.push([outcome, score].filter(Boolean).join(" · "));
  } else {
    lines.push(t.noJudge);
  }

  if (url) lines.push("", t.linkLine(url));
  return lines.join("\n");
}
