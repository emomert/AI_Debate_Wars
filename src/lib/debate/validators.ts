/**
 * Validation lives here in two flavors:
 *  - `assertValidSession` / `assertConsistentTranscript` — the AUTHORITATIVE
 *    server-side validators, called by the API routes before any model is hit.
 *  - `validateSetup` — the lightweight client-side check that gates the Setup
 *    screen's start button (docs/14 "start button disabled until valid").
 *
 * The server validators also enforce upper bounds on every client-supplied
 * string (topic, transcript content), so a crafted session can't make the
 * server build an enormous prompt and burn the deployer's API key.
 */

import type { Locale } from "@/lib/i18n/config";
import type { DebateConfig, DebateSession } from "@/lib/debate/debateTypes";
import {
  CUSTOM_TONE_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
  TOPIC_MIN_LENGTH,
} from "@/lib/constants";
import { getModelById, modelSupportsWebSearch } from "@/lib/models/modelRegistry";
import { ProviderError } from "@/lib/utils/errors";

const VALID_MODES = ["debate", "discussion", "blitz"];
const VALID_ROUNDS = [3, 5, 7];
const VALID_LENGTHS = ["short", "medium", "long", "punchy"];
const VALID_TONES = ["serious", "aggressive", "casual", "custom", "unhinged"];

// Generous per-message ceiling: the "long" preset allows ~1200 output tokens
// (~5-6k chars with markdown), so 16k never clips a legitimate turn but stops a
// forged transcript from amplifying the prompt the server pays for.
const MAX_MESSAGE_CONTENT = 16_000;

/**
 * Authoritative server-side validation for the API routes. Throws a normalized
 * ProviderError that the route serializes. Rejects unknown models, bad enums and
 * malformed sessions, and enforces the max-rounds limit (docs/11).
 */
export function assertValidSession(session: DebateSession): void {
  if (!session || typeof session !== "object") {
    throw new ProviderError("INVALID_SESSION", "Missing session");
  }
  if (typeof session.topic !== "string" || session.topic.trim().length < TOPIC_MIN_LENGTH) {
    throw new ProviderError("INVALID_REQUEST", "Topic too short");
  }
  // Enforce the same cap as the client so a forged session can't smuggle a huge
  // topic into the prompt the server pays for.
  if (session.topic.trim().length > TOPIC_MAX_LENGTH) {
    throw new ProviderError("INVALID_REQUEST", "Topic too long");
  }
  if (!VALID_MODES.includes(session.mode)) {
    throw new ProviderError("INVALID_REQUEST", "Invalid mode");
  }
  if (!VALID_ROUNDS.includes(session.roundCount)) {
    throw new ProviderError("INVALID_REQUEST", "Invalid round count");
  }
  if (!VALID_LENGTHS.includes(session.responseLength)) {
    throw new ProviderError("INVALID_REQUEST", "Invalid response length");
  }
  if (!VALID_TONES.includes(session.tone)) {
    throw new ProviderError("INVALID_REQUEST", "Invalid tone");
  }
  // Custom tone: require non-empty text, capped (so a forged session can't
  // inflate the prompt the server pays for).
  if (session.tone === "custom") {
    // Per-fighter tones each fall back to the shared customTone; both fighters'
    // EFFECTIVE tone must be present and capped (so a forged session can't
    // inflate the prompt the server pays for).
    const shared = typeof session.customTone === "string" ? session.customTone.trim() : "";
    const a = typeof session.customToneA === "string" ? session.customToneA.trim() : "";
    const b = typeof session.customToneB === "string" ? session.customToneB.trim() : "";
    if (!(a || shared) || !(b || shared)) {
      throw new ProviderError("INVALID_REQUEST", "Custom tone is required");
    }
    if (
      shared.length > CUSTOM_TONE_MAX_LENGTH ||
      a.length > CUSTOM_TONE_MAX_LENGTH ||
      b.length > CUSTOM_TONE_MAX_LENGTH
    ) {
      throw new ProviderError("INVALID_REQUEST", "Custom tone too long");
    }
  }
  if (!session.judge || typeof session.judge.enabled !== "boolean") {
    throw new ProviderError("INVALID_REQUEST", "Invalid judge config");
  }
  // NOTE: Deep Debate format & search readiness are deliberately NOT validated
  // here — this validator also runs for /api/debate/verdict, and a finished
  // deep debate must still get its verdict after a search-key rotation or a
  // format-rule change (sessions persisted before the 3-round/standard-tone
  // limits existed would otherwise be bricked). The TURN route enforces both
  // via assertDeepTurnAllowed + its MISSING_API_KEY search guard.
  if (!session.modelA?.modelId || !session.modelB?.modelId) {
    throw new ProviderError("INVALID_REQUEST", "Both fighters are required");
  }
  if (!getModelById(session.modelA.modelId) || !getModelById(session.modelB.modelId)) {
    throw new ProviderError("INVALID_MODEL", "Unknown fighter model");
  }
  if (!Array.isArray(session.turns) || session.turns.length === 0) {
    throw new ProviderError("INVALID_SESSION", "Session has no turns");
  }
  if (session.turns.length > 14) {
    // 7 rounds × 2 speakers is the hard ceiling (docs/11 max rounds).
    throw new ProviderError("INVALID_REQUEST", "Too many turns");
  }
  if (session.mode === "blitz") {
    // Blitz is a fixed-shape mode: exactly 8 turns (4 rounds × A/B), auto pace,
    // punchy length. Guard here so a forged session can't smuggle a longer/slower
    // blitz match past the shared validator.
    if (session.turns.length !== 8) {
      throw new ProviderError("INVALID_REQUEST", "Blitz matches are exactly 8 turns");
    }
    if (session.pace !== "auto") {
      throw new ProviderError("INVALID_REQUEST", "Blitz runs on auto pace");
    }
    if (session.responseLength !== "punchy") {
      throw new ProviderError("INVALID_REQUEST", "Blitz uses punchy length");
    }
  }
}

/**
 * Deep Debate fixed-format guard for NEW turn generation only (3 rounds —
 * deep turns are long and burn search quota — and the standard serious tone).
 * Lives outside assertValidSession so the verdict route never runs it: a
 * finished deep debate from before these limits existed must still get its
 * verdict, but no further deep turns may be generated for it.
 */
export function assertDeepTurnAllowed(session: DebateSession): void {
  if (!session.deepDebate) return;
  if (session.roundCount !== 3) {
    throw new ProviderError("INVALID_REQUEST", "Deep Debate is limited to 3 rounds");
  }
  if (session.tone !== "serious") {
    throw new ProviderError("INVALID_REQUEST", "Deep Debate uses the standard tone");
  }
}

/**
 * Best-effort transcript sanity check (NOT an anti-forgery boundary — the server
 * is stateless and holds no record of what it actually generated, so a
 * determined client can still fabricate consistent-looking content; true
 * anti-forgery needs server-side persistence or signed messages, see docs/11).
 *
 * It (a) requires the number of completed turns to equal the number of messages
 * — so the judge can't run on an empty/partial transcript — and (b) bounds each
 * message's content so a giant fake transcript can't amplify the prompt cost.
 */
export function assertConsistentTranscript(session: DebateSession): void {
  const completed = session.turns.filter((t) => t.status === "complete").length;
  const messages = Array.isArray(session.messages) ? session.messages : null;
  if (!messages || messages.length !== completed) {
    throw new ProviderError(
      "INVALID_REQUEST",
      "Transcript does not match turn state",
    );
  }
  for (const m of messages) {
    if (typeof m?.content !== "string") {
      throw new ProviderError("INVALID_REQUEST", "Malformed transcript message");
    }
    if (m.content.length > MAX_MESSAGE_CONTENT) {
      throw new ProviderError("INVALID_REQUEST", "Transcript message too long");
    }
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<"topic" | "models" | "judge" | "tone" | "deep", string>>;
}

/**
 * User-facing setup error copy, localized. Kept here (not in the shared UI
 * dictionary) because each message is tied to a specific validation rule below.
 */
interface SetupMessages {
  topicRequired: string;
  topicTooLong: (max: number) => string;
  modelsRequired: string;
  customToneRequired: string;
  customToneTooLong: (max: number) => string;
  deepNeedsSearch: string;
  deepFixedFormat: string;
  judgePickThird: string;
}

const SETUP_MESSAGES: Record<Locale, SetupMessages> = {
  en: {
    topicRequired: "Drop a topic into the arena first.",
    topicTooLong: (max) => `Keep it under ${max} characters.`,
    modelsRequired: "Choose two fighters before starting.",
    customToneRequired: "Describe your custom tone.",
    customToneTooLong: (max) => `Keep the tone under ${max} characters.`,
    deepNeedsSearch: "Deep Debate needs the server's web-search key.",
    deepFixedFormat: "Deep Debate runs as 3 rounds with the standard tone.",
    judgePickThird: "Pick a third model to be the judge.",
  },
  tr: {
    topicRequired: "Önce arenaya bir konu girin.",
    topicTooLong: (max) => `${max} karakterin altında tutun.`,
    modelsRequired: "Başlamadan önce iki yarışmacı seçin.",
    customToneRequired: "Özel üslubunuzu tanımlayın.",
    customToneTooLong: (max) => `Üslubu ${max} karakterin altında tutun.`,
    deepNeedsSearch: "Derin Münazara için sunucunun web arama anahtarı gerekir.",
    deepFixedFormat: "Derin Münazara, standart üslupla 3 tur olarak çalışır.",
    judgePickThird: "Hakem olması için üçüncü bir model seçin.",
  },
};

export function validateSetup(
  config: DebateConfig,
  opts?: {
    /**
     * Whether the server's injected search engine is configured, as reported
     * by /api/health (`null` while unknown). Unknown stays optimistic — the
     * server validator is the authority and rejects cleanly if it's missing.
     */
    injectedSearchReady?: boolean | null;
    /** UI locale for the user-facing error messages. Defaults to English. */
    locale?: Locale;
  },
): ValidationResult {
  const m = SETUP_MESSAGES[opts?.locale ?? "en"] ?? SETUP_MESSAGES.en;
  const errors: ValidationResult["errors"] = {};

  const topic = config.topic.trim();
  if (topic.length < TOPIC_MIN_LENGTH) {
    errors.topic = m.topicRequired;
  } else if (topic.length > TOPIC_MAX_LENGTH) {
    errors.topic = m.topicTooLong(TOPIC_MAX_LENGTH);
  }

  // Validate fighters across every battle (battle #1 = modelA/modelB, plus any
  // extra pairings in config.battles).
  const pairs = [
    { modelA: config.modelA, modelB: config.modelB },
    ...(config.battles ?? []),
  ];
  if (pairs.some((p) => !p.modelA || !p.modelB)) {
    errors.models = m.modelsRequired;
  }

  if (config.tone === "custom") {
    // Per-fighter tones fall back to the shared one; both fighters' effective
    // tone must be present and within the cap.
    const shared = (config.customTone ?? "").trim();
    const a = (config.customToneA ?? "").trim();
    const b = (config.customToneB ?? "").trim();
    if (!(a || shared) || !(b || shared)) {
      errors.tone = m.customToneRequired;
    } else if (
      shared.length > CUSTOM_TONE_MAX_LENGTH ||
      a.length > CUSTOM_TONE_MAX_LENGTH ||
      b.length > CUSTOM_TONE_MAX_LENGTH
    ) {
      // Mirror the server cap so Start is blocked instead of failing turn 1.
      errors.tone = m.customToneTooLong(CUSTOM_TONE_MAX_LENGTH);
    }
  }

  const injectedReady = opts?.injectedSearchReady !== false; // unknown → optimistic
  if (
    config.deepDebate &&
    pairs.some(
      (p) =>
        p.modelA &&
        p.modelB &&
        (!modelSupportsWebSearch(p.modelA.modelId, injectedReady) ||
          !modelSupportsWebSearch(p.modelB.modelId, injectedReady)),
    )
  ) {
    errors.deep = m.deepNeedsSearch;
  }
  // Mirror the server's fixed Deep Debate format (the UI normally locks these;
  // this catches stale persisted configs reaching Start via other paths).
  if (config.deepDebate && (config.roundCount !== 3 || config.tone !== "serious")) {
    errors.deep = m.deepFixedFormat;
  }

  if (
    config.judge.enabled &&
    config.judge.mode === "thirdModel" &&
    !config.judge.model
  ) {
    errors.judge = m.judgePickThird;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
