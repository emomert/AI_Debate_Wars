/**
 * Parse a judge response into structured verdict fields. The judge is asked to
 * return strict JSON (docs/05 + promptBuilder), but real models sometimes wrap it
 * in prose/code-fences, so this is defensive: it extracts the JSON object, fills
 * sane fallbacks, normalizes scores to sum 100, and forces a valid winner.
 */

import type { DebateMode, VerdictWinner } from "@/lib/debate/debateTypes";

export interface ParsedVerdict {
  summary: string;
  strongestModelA: string;
  strongestModelB: string;
  weakestModelA: string;
  weakestModelB: string;
  winner: VerdictWinner;
  /** Undefined in Discussion mode (no contest), else two ints summing to 100. */
  scoreModelA?: number;
  scoreModelB?: number;
  practicalConclusion: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function extractJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function str(v: unknown, fallback = "—"): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function parseVerdict(raw: string, mode: DebateMode): ParsedVerdict {
  const obj = extractJsonObject(raw);

  // Resolve raw scores (with fallbacks), then ALWAYS normalize to two ints that
  // sum to exactly 100 derived from a single rounded anchor — so the displayed
  // bars can never sum to 101 and the winner can never contradict them.
  let rawA = num(obj.scoreModelA);
  let rawB = num(obj.scoreModelB);
  if (rawA === undefined && rawB === undefined) {
    rawA = 50;
    rawB = 50;
  } else if (rawA === undefined) {
    rawA = 100 - (rawB as number);
  } else if (rawB === undefined) {
    rawB = 100 - rawA;
  }
  rawA = clamp(rawA as number, 0, 100);
  rawB = clamp(rawB as number, 0, 100);
  const sum = rawA + rawB;
  const a = sum <= 0 ? 50 : Math.round((rawA / sum) * 100);
  const b = 100 - a;

  let winner: VerdictWinner;
  if (mode === "discussion") {
    winner = "not_applicable";
  } else {
    const w = str(obj.winner, "").toLowerCase();
    winner =
      w === "modela"
        ? "modelA"
        : w === "modelb"
          ? "modelB"
          : w === "tie"
            ? "tie"
            : a > b
              ? "modelA"
              : a < b
                ? "modelB"
                : "tie";
  }

  return {
    summary: str(obj.summary, raw.trim().slice(0, 280) || "Verdict delivered."),
    strongestModelA: str(obj.strongestModelA),
    strongestModelB: str(obj.strongestModelB),
    weakestModelA: str(obj.weakestModelA),
    weakestModelB: str(obj.weakestModelB),
    winner,
    // No "score" in Discussion mode — it isn't a contest.
    scoreModelA: mode === "discussion" ? undefined : a,
    scoreModelB: mode === "discussion" ? undefined : b,
    practicalConclusion: str(obj.practicalConclusion, ""),
  };
}

export function formatVerdictText(
  p: ParsedVerdict,
  modelAName: string,
  modelBName: string,
): string {
  const lines = [
    `Verdict: ${p.summary}`,
    ``,
    `Strongest arguments:`,
    `- ${modelAName}: ${p.strongestModelA}`,
    `- ${modelBName}: ${p.strongestModelB}`,
    ``,
    `Weakest points:`,
    `- ${modelAName}: ${p.weakestModelA}`,
    `- ${modelBName}: ${p.weakestModelB}`,
  ];
  if (p.practicalConclusion) {
    lines.push(``, `Practical conclusion: ${p.practicalConclusion}`);
  }
  return lines.join("\n");
}
