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

import type { Locale } from "@/lib/i18n/config";

export type DebateMode = "debate" | "discussion";

export type ResponseLength = "short" | "medium" | "long";

/** Playback pacing: "auto" reveals each turn automatically, "manual" waits for a click. */
export type DebatePace = "auto" | "manual";

export type RoundCount = 3 | 5 | 7;

export type Speaker = "modelA" | "modelB" | "judge";

export type Stance = "pro" | "against";

export type ModelColor = "blue" | "red" | "yellow" | "purple";

// "academic" was promoted out of tones into the Deep Debate capability; the
// 4th slot is now a free-text "custom" tone the user describes.
export type DebateTone = "serious" | "aggressive" | "casual" | "custom";

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
  /**
   * Subset of inputTokens served from the provider's prompt cache (OpenAI
   * `cached_tokens` / DeepSeek `prompt_cache_hit_tokens`). Billed at the model's
   * discounted cached rate, so the displayed cost reflects what was really paid.
   */
  cachedInputTokens?: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  /** Web-search add-on fee for Deep Debate turns (OpenRouter bills per search). */
  searchCost?: number;
  /**
   * USD saved on this turn because some input was served from the prompt cache
   * at the discounted rate. Only set (and >0) when a real discount applied — so
   * the UI never claims a discount for models priced without a cached rate.
   */
  cachedSavings?: number;
  totalCost: number;
  currency: "USD";
  /** True when usage was estimated from text length rather than reported. */
  estimated?: boolean;
}

/** A web source cited in a Deep Debate turn (req: references in a collapsible menu). */
export interface Citation {
  /** 1-based marker matching inline [n] references in the message content. */
  index: number;
  title: string;
  url: string;
  /** Optional excerpt/quote from the source (OpenRouter returns these). */
  quote?: string;
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
  /** Web sources for a Deep Debate turn (omitted for normal turns). */
  citations?: Citation[];
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
  /** Winner-leaning reasoning (may contain **bold**). */
  summary: string;
  /** The winning side's single most decisive argument (empty for tie/discussion). */
  winnerArgument?: string;
  strongestModelA?: string;
  strongestModelB?: string;
  weakestModelA?: string;
  weakestModelB?: string;
  /** @deprecated removed from the verdict UI; kept optional for old stored matches. */
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
  /**
   * Language the debate runs in (UI locale captured when the match starts).
   * Drives the "respond in Turkish" prompt instruction and localized round
   * labels/tasks. Optional for backward-compat with sessions saved before i18n
   * (treated as "en").
   */
  language?: Locale;
  tone: DebateTone;
  /** Free-text tone, set when tone === "custom". */
  customTone?: string;
  /** Deep Debate: web-searched, cited, fixed-template turns (req: separate from tone). */
  deepDebate: boolean;
  responseLength: ResponseLength;
  roundCount: RoundCount;
  pace: DebatePace;
  judge: JudgeConfig;
  modelA: SelectedModel;
  modelB: SelectedModel;
  turns: DebateTurn[];
  messages: DebateMessage[];
  verdict?: DebateVerdict;
  /**
   * Verdicts replaced by a post-match re-judge ("change the judge"). Kept so
   * the cost summary stays honest — every judge call was really paid for.
   */
  pastVerdicts?: DebateVerdict[];
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
  /** Language the debate should run in; defaults to the active UI locale at start. */
  language?: Locale;
  modelA: SelectedModel;
  modelB: SelectedModel;
  roundCount: RoundCount;
  tone: DebateTone;
  /** Free-text tone, set when tone === "custom". */
  customTone?: string;
  /** Deep Debate: web search + citations + fixed template (separate from tone). */
  deepDebate: boolean;
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
