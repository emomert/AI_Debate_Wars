import type { DebateConfig, DebateSession } from "./debateTypes";

/** Build from the viewed battle, never the possibly unrelated setup draft. */
export function switchSidesConfig(session: DebateSession): DebateConfig {
  return {
    topic: session.topic,
    mode: "debate",
    language: session.language,
    modelA: { ...session.modelB, color: "blue" },
    modelB: { ...session.modelA, color: "red" },
    battles: [],
    roundCount: 3,
    responseLength: "short",
    tone: session.deepDebate ? "serious" : session.tone,
    customTone: session.customTone,
    customToneA: session.customToneB,
    customToneB: session.customToneA,
    deepDebate: session.deepDebate,
    pace: session.pace,
    judge: session.judge.enabled && session.judge.mode === "thirdModel"
      ? structuredClone(session.judge)
      : { enabled: true, mode: "auto" },
  };
}
