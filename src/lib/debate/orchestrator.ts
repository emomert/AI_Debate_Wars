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
  DebateConfig,
  DebateSession,
  DebateTurn,
  SelectedModel,
  Speaker,
} from "@/lib/debate/debateTypes";
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
  const plan = getRoundPlan(config.mode, config.roundCount);
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
      stance: config.mode === "debate" ? "pro" : undefined,
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
      stance: config.mode === "debate" ? "against" : undefined,
      modelId: config.modelB.modelId,
      status: "pending",
    });
  }

  const ts = now();
  return {
    id: sessionId,
    topic: config.topic.trim(),
    mode: config.mode,
    tone: config.tone,
    customTone: config.customTone,
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
