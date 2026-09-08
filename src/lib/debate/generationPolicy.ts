import type { DebateSession, SelectedModel } from "./debateTypes";
import { createDebateSession } from "./orchestrator";
import { assertDeepTurnAllowed, assertValidSession } from "./validators";
import { getModelById } from "@/lib/models/modelRegistry";
import { ProviderError } from "@/lib/utils/errors";

function invalid(message: string): never {
  throw new ProviderError("INVALID_SESSION", message);
}

/** Legacy sessions remain viewable; only this fixed format can buy new work. */
export function canonicalGenerationSession(input: DebateSession): DebateSession {
  assertValidSession(input);
  if (input.mode !== "debate" || input.roundCount !== 3 || input.responseLength !== "short" ||
      (input.language !== undefined && input.language !== "en") || typeof input.deepDebate !== "boolean") {
    invalid("New matches require an English, three-round, short debate");
  }
  assertDeepTurnAllowed(input);
  const validId = (id: unknown) => typeof id === "string" && /^[\w-]{1,100}$/.test(id);
  if (!validId(input.id) || input.turns.length !== 6 ||
      input.turns.some(t => !t || !validId(t.id)) || new Set(input.turns.map(t => t.id)).size !== 6) {
    invalid("Invalid session or turn identifiers");
  }
  for (const value of [input.customTone, input.customToneA, input.customToneB]) {
    if (value !== undefined && (typeof value !== "string" || value.length > 300)) invalid("Invalid custom tone");
  }
  if (!input.judge || input.judge.enabled !== true ||
      !["auto", "thirdModel"].includes(input.judge.mode)) invalid("New matches require Auto or a selected judge");
  const model = (selected: { modelId: string }, color: "blue" | "red" | "yellow"): SelectedModel => {
    const entry = getModelById(selected?.modelId);
    if (!entry) invalid("Unknown model");
    return { modelId: entry.id, providerId: entry.providerId, displayName: entry.displayName, color };
  };
  const judge = {
    enabled: input.judge.enabled,
    mode: input.judge.mode,
    ...(input.judge.mode === "thirdModel" ? { model: model(input.judge.model!, "yellow") } : {}),
  };
  const session = createDebateSession({
    topic: input.topic, mode: "debate", roundCount: 3, responseLength: "short", language: "en",
    tone: input.tone, customTone: input.customTone, customToneA: input.customToneA,
    customToneB: input.customToneB, deepDebate: input.deepDebate, pace: "auto", judge,
    modelA: model(input.modelA, "blue"), modelB: model(input.modelB, "red"),
  });
  session.id = input.id;
  session.turns.forEach((turn, index) => { turn.id = input.turns[index]!.id; });
  // Only grouping metadata is retained; prompt instructions/progress come from the server.
  if (validId(input.matchSetId)) session.matchSetId = input.matchSetId;
  if (Number.isInteger(input.battleIndex) && input.battleIndex! >= 0 && input.battleIndex! < 3) session.battleIndex = input.battleIndex;
  if (Number.isInteger(input.battleCount) && input.battleCount! >= 1 && input.battleCount! <= 3) session.battleCount = input.battleCount;
  return session;
}

export function generationIdentity(session: DebateSession): string {
  return JSON.stringify([
    session.topic, session.mode, session.roundCount, session.responseLength, session.language,
    session.tone, session.customTone, session.customToneA, session.customToneB, session.deepDebate,
    session.modelA.modelId, session.modelB.modelId, session.turns.map(t => t.id),
  ]);
}
