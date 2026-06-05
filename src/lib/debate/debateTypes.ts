/**
 * Core domain types for AI Debate Arena.
 *
 * These mirror docs/04_DEBATE_ENGINE.md, docs/06_API_CONTRACTS.md and
 * docs/10_DATA_MODEL.md exactly so that Phase 2 (orchestrator), Phase 3
 * (providers) and Phase 4 (streaming/cost) can be added without reshaping the
 * data model or rewriting the UI.
 *
 * Nothing here is provider-specific. Provider-facing types live in
 * `src/lib/providers/types.ts` (added in Phase 3).
 */

export type DebateMode = "debate" | "discussion";

export type ResponseLength = "short" | "medium" | "long";

/** Playback pacing: "auto" reveals each turn automatically, "manual" waits for a click. */
export type DebatePace = "auto" | "manual";

export type RoundCount = 3 | 5 | 7;

export type Speaker = "modelA" | "modelB" | "judge";

export type Stance = "pro" | "against";

export type ModelColor = "blue" | "red" | "yellow" | "purple";

export type DebateTone = "serious" | "academic" | "aggressive" | "casual";

export type JudgeMode = "none" | "auto" | "modelA" | "modelB" | "thirdModel";

export interface JudgeConfig {
  enabled: boolean;
  mode: JudgeMode;
  model?: ModelRef;
}

/** A minimal reference to a model — used in API requests. */
export interface ModelRef {
  providerId: string;
  modelId: string;
}

/** A model that has been chosen for a slot, carrying its display identity. */
export interface SelectedModel {
  providerId: string;
  modelId: string;
  displayName: string;
  nickname: string;
  color: ModelColor;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: "USD";
  /** True when usage was estimated from text length rather than reported. */
  estimated?: boolean;
}

export interface SessionCostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  currency: "USD";
}

export type TurnStatus = "pending" | "streaming" | "complete" | "error";

export interface DebateTurn {
  id: string;
  roundNumber: number;
  roundLabel: string;
  speaker: Speaker;
  task: string;
  role: string;
  stance?: Stance;
  modelId: string;
  status: TurnStatus;
}

export type MessageStatus = "streaming" | "complete" | "error";

export interface DebateMessage {
  id: string;
  sessionId: string;
  turnId: string;
  speaker: Speaker;
  providerId: string;
  modelId: string;
  role: string;
  stance?: Stance;
  roundNumber?: number;
  roundLabel?: string;
  content: string;
  usage?: TokenUsage;
  cost?: CostBreakdown;
  latencyMs?: number;
  status: MessageStatus;
  createdAt: string;
}

export type VerdictWinner = "modelA" | "modelB" | "tie" | "not_applicable";

export interface DebateVerdict {
  id: string;
  sessionId: string;
  judgeModelId: string;
  content: string;
  winner?: VerdictWinner;
  summary: string;
  strongestModelA?: string;
  strongestModelB?: string;
  weakestModelA?: string;
  weakestModelB?: string;
  practicalConclusion?: string;
  scoreModelA?: number;
  scoreModelB?: number;
  usage?: TokenUsage;
  cost?: CostBreakdown;
  latencyMs?: number;
  createdAt: string;
}

export type SessionStatus =
  | "setup"
  | "running"
  | "judging"
  | "complete"
  | "stopped"
  | "error";

export interface DebateSession {
  id: string;
  topic: string;
  mode: DebateMode;
  tone: DebateTone;
  responseLength: ResponseLength;
  roundCount: RoundCount;
  pace: DebatePace;
  judge: JudgeConfig;
  modelA: SelectedModel;
  modelB: SelectedModel;
  turns: DebateTurn[];
  messages: DebateMessage[];
  verdict?: DebateVerdict;
  costSummary: SessionCostSummary;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * The raw configuration captured by the Setup screen, before a session object
 * is built. This is what `/api/debate/start` will eventually receive.
 */
export interface DebateConfig {
  topic: string;
  mode: DebateMode;
  modelA: SelectedModel;
  modelB: SelectedModel;
  roundCount: RoundCount;
  tone: DebateTone;
  responseLength: ResponseLength;
  pace: DebatePace;
  judge: JudgeConfig;
}

/** A single row in a deterministic round plan (docs/04_DEBATE_ENGINE.md). */
export interface RoundPlanEntry {
  round: number;
  label: string;
  modelATask: string;
  modelBTask: string;
}
