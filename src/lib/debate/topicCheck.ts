/**
 * Topic-checker prompt + parser (pure, framework-agnostic). A cheap, fast model
 * (DeepSeek V4 Flash by default) reads the user's proposed topic and judges
 * whether it's a strong, clearly two-sided debate topic — and, if not, proposes
 * sharper ready-to-use alternatives.
 *
 * Prompt construction lives here (separate from the provider call in
 * /api/topic/check), mirroring how promptBuilder is separate from the providers.
 */

import type { Locale } from "@/lib/i18n/config";

export type TopicVerdict = "good" | "weak" | "unclear";

export interface TopicCheckResult {
  /** "good" = already strong; "weak" = debatable but could be sharper;
   *  "unclear" = not really a two-sided debate topic. */
  verdict: TopicVerdict;
  /** One short, friendly sentence explaining the verdict. */
  assessment: string;
  /** 0–3 improved, ready-to-use debate topics (empty when verdict is "good"). */
  suggestions: string[];
}

export const TOPIC_CHECK_SYSTEM_PROMPT = `You are a topic coach for a structured AI debate arena. The user proposes a topic, and two AI models will then argue OPPOSITE sides of it in front of a judge.

Your job: judge whether the proposed topic is a strong debate topic — clear, specific, and genuinely two-sided (reasonable people could argue either way) — and, when it isn't, rewrite it into sharper alternatives that capture what the user seems to want.

A STRONG topic is a focused claim or question with two defensible sides (e.g. "Social media has done more harm than good"). A WEAK topic is debatable but vague, bland, or lopsided. An UNCLEAR topic isn't really debatable: too broad, a personal/factual request, one-sided, or nonsensical.

Be encouraging but honest. Reply with STRICT JSON only — no markdown, no code fences, no commentary.`;

/** Build the per-request user prompt for the topic checker. */
export function buildTopicCheckPrompt(topic: string, language: Locale = "en"): string {
  const langLine =
    language === "tr"
      ? `\nWrite "assessment" and every "suggestions" item in Turkish (Türkçe), in natural fluent Turkish.`
      : "";
  return [
    `User's proposed debate topic:`,
    `"${topic}"`,
    ``,
    `Return ONLY a single JSON object with EXACTLY these keys:`,
    `{`,
    `  "verdict": "good" | "weak" | "unclear",   // good = already a strong two-sided topic; weak = debatable but vague/bland/lopsided; unclear = not really debatable`,
    `  "assessment": string,                       // ONE short, friendly sentence (max ~20 words) explaining the verdict`,
    `  "suggestions": string[]                     // 0 to 3 improved, ready-to-use debate topics capturing the user's intent — each a sharp, two-sided claim or question, max ~100 characters. Return [] when verdict is "good".`,
    `}`,
    `Do not include any text outside the JSON object.${langLine}`,
  ].join("\n");
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

function normalizeVerdict(v: unknown): TopicVerdict {
  const s = typeof v === "string" ? v.toLowerCase().trim() : "";
  if (s === "good" || s === "strong") return "good";
  if (s === "unclear" || s === "bad" || s === "invalid") return "unclear";
  return "weak";
}

/** Normalize a topic string for de-duplication (trim, collapse spaces, cap). */
function topicKey(s: string): string {
  return s.trim().replace(/\s+/g, " ").slice(0, 160).toLowerCase();
}

/**
 * Parse a topic-check response defensively. Real models sometimes wrap JSON in
 * prose; this extracts the object, clamps the verdict to one of three values,
 * and caps suggestions to 3 clean, de-duplicated, length-limited strings. Any
 * suggestion identical to the user's current topic is dropped so the UI never
 * offers a no-op "try this instead".
 */
export function parseTopicCheck(raw: string, originalTopic = ""): TopicCheckResult {
  const obj = extractJsonObject(raw);
  const verdict = normalizeVerdict(obj.verdict);

  const assessment =
    typeof obj.assessment === "string" && obj.assessment.trim()
      ? obj.assessment.trim().slice(0, 200)
      : "";

  const rawSuggestions = Array.isArray(obj.suggestions) ? obj.suggestions : [];
  const seen = new Set<string>();
  // Seed with the user's own topic so an echoed suggestion is filtered out.
  const original = topicKey(originalTopic);
  if (original) seen.add(original);
  const suggestions: string[] = [];
  for (const s of rawSuggestions) {
    if (typeof s !== "string") continue;
    const clean = s.trim().replace(/\s+/g, " ").slice(0, 160);
    const key = clean.toLowerCase();
    if (clean.length >= 8 && !seen.has(key)) {
      seen.add(key);
      suggestions.push(clean);
    }
    if (suggestions.length >= 3) break;
  }

  // A "good" verdict shouldn't carry alternatives; a non-good verdict with no
  // assessment still returns the (possibly empty) suggestions for the UI.
  return {
    verdict,
    assessment,
    suggestions: verdict === "good" ? [] : suggestions,
  };
}
