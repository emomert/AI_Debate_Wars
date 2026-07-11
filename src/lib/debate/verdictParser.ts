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
  /** Winner-leaning reasoning (may contain **bold**); was the neutral "summary". */
  summary: string;
  /** The winning side's single most decisive argument (empty for tie/discussion). */
  winnerArgument: string;
  strongestModelA: string;
  strongestModelB: string;
  weakestModelA: string;
  weakestModelB: string;
  winner: VerdictWinner;
  /** Undefined in Discussion mode (no contest), else two ints summing to 100. */
  scoreModelA?: number;
  scoreModelB?: number;
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

/**
 * Salvage fields from TRUNCATED / malformed judge output. Reasoning models can
 * burn their token budget on hidden thinking and get cut off mid-JSON — strict
 * parsing then fails and (before this) the UI fell back to showing the raw JSON
 * text itself. Field-level regexes recover whatever keys made it out intact,
 * including a string value cut off before its closing quote.
 */
function looseExtractFields(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const strField = (key: string): string | undefined => {
    // Capture escaped-char-tolerant string content up to the closing quote OR
    // the end of the (truncated) text.
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`));
    if (!m) return undefined;
    // Unescape via JSON.parse; a truncation can leave a dangling backslash.
    const captured = m[1].replace(/\\$/, "");
    try {
      return JSON.parse(`"${captured}"`) as string;
    } catch {
      return captured;
    }
  };
  const numField = (key: string): number | undefined => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`));
    return m ? parseFloat(m[1]) : undefined;
  };
  for (const key of [
    "winner",
    "winnerArgument",
    "reasoning",
    "summary",
    "strongestModelA",
    "strongestModelB",
    "weakestModelA",
    "weakestModelB",
  ]) {
    const v = strField(key);
    if (v !== undefined) out[key] = v;
  }
  for (const key of ["scoreModelA", "scoreModelB"]) {
    const v = numField(key);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

/**
 * Tidy a string recovered from a truncated response: if it was cut off
 * mid-sentence, trim back to the last complete sentence (kept only when that
 * doesn't destroy most of the text).
 */
function tidyTruncated(text: string): string {
  let t = text.trim();
  if (!t || /[.!?…"']$/.test(t)) return t;
  const lastStop = Math.max(t.lastIndexOf("."), t.lastIndexOf("!"), t.lastIndexOf("?"));
  if (lastStop > t.length * 0.4) return t.slice(0, lastStop + 1);
  // No usable sentence boundary: drop a dangling opened **bold** marker and the
  // cut-off partial word, then mark the cutoff with an ellipsis.
  t = t.replace(/\s*\*\*[^*]*$/, "").replace(/\s+\S*$/, "").trimEnd();
  return t ? `${t}…` : "";
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
  let obj = extractJsonObject(raw);
  // Strict parse failed (typically a TRUNCATED response) → salvage what we can
  // field-by-field, and tidy strings that were cut off mid-sentence.
  let truncated = false;
  if (Object.keys(obj).length === 0) {
    obj = looseExtractFields(raw);
    truncated = true;
  }

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

  // NEVER fall back to the raw text: on a failed parse the raw text IS the
  // (truncated) JSON blob, and slicing it into the summary rendered literal
  // `{ "winner": …` on the verdict card. A generic line beats leaked JSON.
  const tidy = (s: string): string => (truncated ? tidyTruncated(s) : s);
  return {
    // "reasoning" is the new key; fall back to the legacy "summary" for safety.
    summary: tidy(str(obj.reasoning ?? obj.summary, "Verdict delivered.")) || "Verdict delivered.",
    // Only a concrete fighter winner has a "winning argument" — clear it for a
    // tie / discussion so it can never sit under an "It's a draw" headline
    // (mirrors how scores are reconciled to the winner above).
    winnerArgument:
      winner === "modelA" || winner === "modelB" ? tidy(str(obj.winnerArgument, "")) : "",
    // Legacy fields — no longer requested from the judge or shown in the UI,
    // but still parsed when a model volunteers them (empty otherwise).
    strongestModelA: str(obj.strongestModelA, ""),
    strongestModelB: str(obj.strongestModelB, ""),
    weakestModelA: str(obj.weakestModelA, ""),
    weakestModelB: str(obj.weakestModelB, ""),
    winner,
    // No "score" in Discussion mode — it isn't a contest.
    scoreModelA: mode === "discussion" ? undefined : a,
    scoreModelB: mode === "discussion" ? undefined : b,
  };
}

export function formatVerdictText(
  p: ParsedVerdict,
  modelAName: string,
  modelBName: string,
): string {
  const lines = [
    // Plain text — strip the **bold** markers the reasoning may contain.
    `Verdict: ${p.summary.replace(/\*\*/g, "")}`,
    ...(p.winnerArgument ? [``, `Winning argument: ${p.winnerArgument}`] : []),
    // Legacy sections — only present when an (older) judge response included them.
    ...(p.strongestModelA || p.strongestModelB
      ? [
          ``,
          `Strongest arguments:`,
          ...(p.strongestModelA ? [`- ${modelAName}: ${p.strongestModelA}`] : []),
          ...(p.strongestModelB ? [`- ${modelBName}: ${p.strongestModelB}`] : []),
        ]
      : []),
    ...(p.weakestModelA || p.weakestModelB
      ? [
          ``,
          `Weakest points:`,
          ...(p.weakestModelA ? [`- ${modelAName}: ${p.weakestModelA}`] : []),
          ...(p.weakestModelB ? [`- ${modelBName}: ${p.weakestModelB}`] : []),
        ]
      : []),
  ];
  return lines.join("\n");
}
