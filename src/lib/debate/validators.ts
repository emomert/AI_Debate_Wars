/**
 * Lightweight client-side validation for the Setup screen (docs/14_TEST_PLAN.md
 * "start button disabled until valid"). The authoritative server-side
 * validation arrives with the API routes in Phase 3.
 */

import type { DebateConfig, DebateSession } from "@/lib/debate/debateTypes";
import { TOPIC_MAX_LENGTH, TOPIC_MIN_LENGTH } from "@/lib/constants";
import { getModelById } from "@/lib/models/modelRegistry";
import { ProviderError } from "@/lib/utils/errors";

const VALID_MODES = ["debate", "discussion"];
const VALID_ROUNDS = [3, 5, 7];

/**
 * Authoritative server-side validation for the API routes. Throws a normalized
 * ProviderError that the route serializes. Rejects unknown models, bad enums and
 * malformed sessions, and enforces the max-rounds limit (docs/11).
 */
export function assertValidSession(session: DebateSession): void {
  if (!session || typeof session !== "object") {
    throw new ProviderError("INVALID_SESSION", "Missing session");
  }
  if (!session.topic || session.topic.trim().length < TOPIC_MIN_LENGTH) {
    throw new ProviderError("INVALID_REQUEST", "Topic too short");
  }
  if (!VALID_MODES.includes(session.mode)) {
    throw new ProviderError("INVALID_REQUEST", "Invalid mode");
  }
  if (!VALID_ROUNDS.includes(session.roundCount)) {
    throw new ProviderError("INVALID_REQUEST", "Invalid round count");
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
 * Cross-check the transcript against turn state: the number of completed turns
 * must equal the number of messages. This stops a client from claiming turns are
 * "complete" while sending an empty/partial transcript (which would otherwise let
 * the judge run on a debate that never happened, or generate a turn with missing
 * context). Server-derived consistency, not trust in client `status` flags.
 */
export function assertConsistentTranscript(session: DebateSession): void {
  const completed = session.turns.filter((t) => t.status === "complete").length;
  const messageCount = Array.isArray(session.messages) ? session.messages.length : -1;
  if (messageCount !== completed) {
    throw new ProviderError(
      "INVALID_REQUEST",
      "Transcript does not match turn state",
    );
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
