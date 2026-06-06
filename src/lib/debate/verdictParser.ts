/**
 * Parse a judge response into structured verdict fields. The judge is asked to
 * return strict JSON (docs/05 + promptBuilder), but real models sometimes wrap it
 * in prose/code-fences, so this is defensive: it extracts the JSON object, fills
 * sane fallbacks, normalizes scores to sum 100, reads the winner leniently
 * ("A" / "Model A" / a display name / "tie"), and reconciles the winner with the
 * score bars so the headline can never contradict them.
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

/** Lowercase + strip non-alphanumerics: "Model A" / "model_a" -> "modela". */
function normToken(v: unknown): string {
  return typeof v === "string" ? v.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

/**
 * Resolve the model's free-text winner leniently — accepting "A"/"Model A",
 * "tie"/"draw", or the fighter's display name — or null if it can't be read.
 */
function resolveTextWinner(
  rawWinner: unknown,
  modelAName?: string,
  modelBName?: string,
): "modelA" | "modelB" | "tie" | null {
  const w = normToken(rawWinner);
  if (!w) return null;
  if (w === "tie" || w === "draw" || w === "none" || w === "neither") return "tie";
  if (w === "modela" || w === "a") return "modelA";
  if (w === "modelb" || w === "b") return "modelB";
  const an = normToken(modelAName);
  const bn = normToken(modelBName);
  // Exact display-name match wins outright.
  if (an && w === an) return "modelA";
  if (bn && w === bn) return "modelB";
  // Substring containment only counts if it matches EXACTLY ONE name — so when
  // one name is a substring of the other (e.g. "GPT-4o" vs "GPT-4o Mini"),
  // an ambiguous hit falls through to the score-derived winner instead of being
  // misattributed to the shorter name.
  const inA = an !== "" && w.includes(an);
  const inB = bn !== "" && w.includes(bn);
  if (inA && !inB) return "modelA";
  if (inB && !inA) return "modelB";
  return null;
}

export function parseVerdict(
  raw: string,
  mode: DebateMode,
  modelAName?: string,
  modelBName?: string,
): ParsedVerdict {
  const obj = extractJsonObject(raw);

  // Resolve raw scores (with fallbacks), then ALWAYS normalize to two ints that
  // sum to exactly 100 derived from a single rounded anchor.
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
  let a = sum <= 0 ? 50 : Math.round((rawA / sum) * 100);
  let b = 100 - a;

  let winner: VerdictWinner;
  if (mode === "discussion") {
    winner = "not_applicable";
  } else {
    // Prefer the model's explicit (leniently-parsed) winner; otherwise derive
    // it from the scores.
    winner =
      resolveTextWinner(obj.winner, modelAName, modelBName) ??
      (a > b ? "modelA" : a < b ? "modelB" : "tie");

    // Reconcile the bars with the chosen winner so the headline can NEVER
    // contradict the score bars (the bug this guards: a named winner sitting
    // next to bars that favor the other side, or a decisive winner with a flat
    // 50/50 when scores were missing).
    if (winner === "modelA" && a <= b) {
      a = Math.max(60, a);
      b = 100 - a;
    } else if (winner === "modelB" && b <= a) {
      b = Math.max(60, b);
      a = 100 - b;
    } else if (winner === "tie") {
      a = 50;
      b = 50;
    }
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
