/**
 * Debate orchestrator (docs/04_DEBATE_ENGINE.md) — the deterministic heart.
 *
 * It builds the finite turn plan (always Model A then Model B, per round) and
 * answers the engine questions: what is the next turn, is the debate complete,
 * should the judge run yet. It NEVER asks a model "what happens next" and it can
 * never loop forever — the turn list is fixed at creation time.
 *
 * Replaces the Phase 1 `mockDebate.ts` stand-in. Provider-agnostic: the same
 * session is played in mock mode or with real providers.
 */

import type {
  BattleFighters,
  DebateConfig,
  DebateSession,
  DebateTurn,
  SelectedModel,
  Speaker,
} from "@/lib/debate/debateTypes";
import { MAX_BATTLES } from "@/lib/debate/debateTypes";
import { getRoundPlan } from "@/lib/debate/roundPlans";
import { MODE_OPTIONS } from "@/lib/constants";
import { EMPTY_COST_SUMMARY } from "@/lib/cost/calculateCost";
import { createId } from "@/lib/utils/ids";
import { now } from "@/lib/utils/time";

function rolesForMode(mode: DebateConfig["mode"]): { a: string; b: string } {
  const opt = MODE_OPTIONS.find((m) => m.id === mode)!;
  return { a: opt.modelARole, b: opt.modelBRole };
}

/**
 * Build a fresh, ready-to-run session with deterministic pending turns.
 * Status is "running" so the live screen can begin immediately.
 */
export function createDebateSession(config: DebateConfig): DebateSession {
  const language = config.language ?? "en";
  const plan = getRoundPlan(config.mode, config.roundCount, language);
  const roles = rolesForMode(config.mode);
  const sessionId = createId("sess");

  const turns: DebateTurn[] = [];
  for (const entry of plan) {
    turns.push({
      id: createId("turn"),
      roundNumber: entry.round,
      roundLabel: entry.label,
      speaker: "modelA",
      task: entry.modelATask,
      role: roles.a,
      stance: config.mode === "debate" || config.mode === "blitz" ? "pro" : undefined,
      modelId: config.modelA.modelId,
      status: "pending",
    });
    turns.push({
      id: createId("turn"),
      roundNumber: entry.round,
      roundLabel: entry.label,
      speaker: "modelB",
      task: entry.modelBTask,
      role: roles.b,
      stance: config.mode === "debate" || config.mode === "blitz" ? "against" : undefined,
      modelId: config.modelB.modelId,
      status: "pending",
    });
  }

  const ts = now();
  return {
    id: sessionId,
    topic: config.topic.trim(),
    mode: config.mode,
    language,
    tone: config.tone,
    customTone: config.customTone,
    customToneA: config.customToneA,
    customToneB: config.customToneB,
    deepDebate: config.deepDebate,
    responseLength: config.responseLength,
    roundCount: config.roundCount,
    pace: config.pace,
    judge: config.judge,
    modelA: config.modelA,
    modelB: config.modelB,
    turns,
    messages: [],
    costSummary: EMPTY_COST_SUMMARY,
    status: "running",
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * The full list of battle fighter pairings for a config: the primary
 * `modelA`/`modelB` (battle #1) followed by any EXTRA pairs in `config.battles`.
 * Always returns at least one pair, and never more than MAX_BATTLES — the single
 * source of truth for "how many battles does this match have".
 */
export function getBattlePairs(config: DebateConfig): BattleFighters[] {
  const extras = config.battles ?? [];
  const pairs: BattleFighters[] = [
    { modelA: config.modelA, modelB: config.modelB },
    ...extras,
  ];
  return pairs.slice(0, MAX_BATTLES);
}

/**
 * Build one ready-to-run session PER battle pairing — same topic + shared
 * settings, different fighters. All sessions share a `matchSetId` and carry
 * their `battleIndex`/`battleCount` so the live arena + results can group and
 * label them. A single-battle config yields a 1-element array (battle #1 only),
 * so the multi-battle path collapses cleanly to today's behavior.
 *
 * Slot colors are enforced here (A blue, B red) so a stray extra-battle pair
 * with wrong colors can't leak into the cards.
 */
export function createDebateSessions(config: DebateConfig): DebateSession[] {
  const pairs = getBattlePairs(config);
  const matchSetId = createId("set");
  const battleCount = pairs.length;
  return pairs.map((pair, battleIndex) => {
    const session = createDebateSession({
      ...config,
      modelA: { ...pair.modelA, color: "blue" },
      modelB: { ...pair.modelB, color: "red" },
    });
    session.matchSetId = matchSetId;
    session.battleIndex = battleIndex;
    session.battleCount = battleCount;
    return session;
  });
}

export function getNextTurn(session: DebateSession): DebateTurn | null {
  return session.turns.find((t) => t.status === "pending") ?? null;
}

export function getTurnById(session: DebateSession, turnId: string): DebateTurn | null {
  return session.turns.find((t) => t.id === turnId) ?? null;
}

export function isDebateComplete(session: DebateSession): boolean {
  return session.turns.length > 0 && session.turns.every((t) => t.status === "complete");
}

export function shouldGenerateJudge(session: DebateSession): boolean {
  return isDebateComplete(session) && session.judge.enabled;
}

export function speakerModel(session: DebateSession, speaker: Speaker): SelectedModel {
  return speaker === "modelB" ? session.modelB : session.modelA;
}
