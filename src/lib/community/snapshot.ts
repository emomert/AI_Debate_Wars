/**
 * Publish-time sanitizer: DebateSession → SharedSnapshot.
 *
 * Runs SERVER-SIDE in /api/community/publish so the stored row can never
 * contain more than the sharer chose to show. Stripping rules:
 *  - costs, token usage, latency and provider/model ids: ALWAYS removed
 *    (private to the owner; ids would fingerprint hidden fighters);
 *  - model names/nicknames/avatars/colors: masked when showModels is off
 *    (colors + avatars identify providers/models, so they're masked too);
 *  - verdict (and any judge-spoken messages): removed when includeVerdict is
 *    off — and the judge's name is hidden whenever naming it would unmask a
 *    fighter that judged its own match.
 */

import type { DebateSession, SelectedModel } from "@/lib/debate/debateTypes";
import { getModelById } from "@/lib/models/modelRegistry";
import type {
  PublishOptions,
  SharedFighter,
  SharedMessage,
  SharedSnapshot,
  SharedVerdict,
} from "@/lib/community/types";

/** Neutral corner identities when model names are hidden. */
const MASKED_A: SharedFighter = { name: null, nickname: null, avatar: "🥊", color: "blue" };
const MASKED_B: SharedFighter = { name: null, nickname: null, avatar: "🛡️", color: "red" };

function fighterFrom(model: SelectedModel): SharedFighter {
  return {
    name: model.displayName,
    nickname: model.nickname,
    avatar: getModelById(model.modelId)?.avatar ?? "🤖",
    color: model.color,
  };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The verdict route DE-anonymizes the judge's text (real model names are
 * substituted back in — see /api/debate/verdict). When the sharer hides model
 * names, those names must be masked again or the verdict text would leak them.
 */
function maskNames(text: string, session: DebateSession): string {
  return text
    .replace(new RegExp(escapeRegExp(session.modelA.displayName), "gi"), "Fighter A")
    .replace(new RegExp(escapeRegExp(session.modelB.displayName), "gi"), "Fighter B");
}

function verdictFrom(session: DebateSession, showModels: boolean): SharedVerdict | undefined {
  const v = session.verdict;
  if (!v) return undefined;
  const clean = (text: string | undefined): string | undefined =>
    text === undefined ? undefined : showModels ? text : maskNames(text, session);
  // A fighter can judge its own match (judge mode modelA/modelB) — naming that
  // judge would unmask a hidden fighter, so the judge stays anonymous too.
  const judgeIsFighter =
    v.judgeModelId === session.modelA.modelId || v.judgeModelId === session.modelB.modelId;
  const judgeName =
    showModels || !judgeIsFighter
      ? (getModelById(v.judgeModelId)?.displayName ?? v.judgeModelId)
      : null;
  return {
    winner: v.winner,
    summary: clean(v.summary) ?? "",
    winnerArgument: clean(v.winnerArgument),
    strongestModelA: clean(v.strongestModelA),
    strongestModelB: clean(v.strongestModelB),
    weakestModelA: clean(v.weakestModelA),
    weakestModelB: clean(v.weakestModelB),
    scoreModelA: v.scoreModelA,
    scoreModelB: v.scoreModelB,
    judgeName,
  };
}

export function buildSharedSnapshot(
  session: DebateSession,
  options: PublishOptions,
): SharedSnapshot {
  const messages: SharedMessage[] = session.messages
    .filter((m) => m.status === "complete" && m.speaker !== "judge")
    .map((m) => ({
      speaker: m.speaker as "modelA" | "modelB",
      roundLabel: m.roundLabel,
      stance: m.stance,
      content: m.content,
      ...(m.citations && m.citations.length > 0 ? { citations: m.citations } : {}),
    }));

  return {
    v: 1,
    topic: session.topic,
    roundCount: session.roundCount,
    deepDebate: session.deepDebate,
    fighters: options.showModels
      ? { a: fighterFrom(session.modelA), b: fighterFrom(session.modelB) }
      : { a: MASKED_A, b: MASKED_B },
    messages,
    ...(options.includeVerdict
      ? { verdict: verdictFrom(session, options.showModels) }
      : {}),
  };
}
