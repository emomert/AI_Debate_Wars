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

import type { DebateConfig, DebateSession } from "@/lib/debate/debateTypes";
import { TOPIC_MAX_LENGTH, TOPIC_MIN_LENGTH } from "@/lib/constants";
import { getModelById } from "@/lib/models/modelRegistry";
import { ProviderError } from "@/lib/utils/errors";

const VALID_MODES = ["debate", "discussion"];
const VALID_ROUNDS = [3, 5, 7];
const VALID_LENGTHS = ["short", "medium", "long"];
const VALID_TONES = ["serious", "academic", "aggressive", "casual"];

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
  if (!session.judge || typeof session.judge.enabled !== "boolean") {
    throw new ProviderError("INVALID_REQUEST", "Invalid judge config");
  }
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
  errors: Partial<Record<"topic" | "models" | "judge", string>>;
}

export function validateSetup(config: DebateConfig): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  const topic = config.topic.trim();
  if (topic.length < TOPIC_MIN_LENGTH) {
    errors.topic = "Drop a topic into the arena first.";
  } else if (topic.length > TOPIC_MAX_LENGTH) {
    errors.topic = `Keep it under ${TOPIC_MAX_LENGTH} characters.`;
  }

  if (!config.modelA || !config.modelB) {
    errors.models = "Choose two fighters before starting.";
  }

  if (
    config.judge.enabled &&
    config.judge.mode === "thirdModel" &&
    !config.judge.model
  ) {
    errors.judge = "Pick a third model to be the judge.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
