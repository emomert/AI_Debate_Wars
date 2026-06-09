/**
 * Typed request/response contracts for the debate API routes (docs/06). Imported
 * by BOTH the client (src/lib/api/debateClient.ts) and the route handlers so the
 * wire format stays in lockstep.
 */

import type {
  DebateMessage,
  DebateSession,
  DebateVerdict,
} from "@/lib/debate/debateTypes";
import type { TopicCheckResult } from "@/lib/debate/topicCheck";
import type { Locale } from "@/lib/i18n/config";
import type { AppErrorCode } from "@/lib/utils/errors";

/** POST /api/debate/turn — generate exactly one AI turn. */
export interface GenerateTurnRequest {
  session: DebateSession;
  turnId: string;
}

export interface GenerateTurnResponse {
  message: DebateMessage;
}

/** POST /api/debate/verdict — generate the judge verdict (rounds must be done). */
export interface GenerateVerdictRequest {
  session: DebateSession;
}

export interface GenerateVerdictResponse {
  verdict: DebateVerdict;
}

/** POST /api/topic/check — AI sanity-check / improve a proposed debate topic. */
export interface TopicCheckRequest {
  topic: string;
  language?: Locale;
}

export interface TopicCheckResponse {
  result: TopicCheckResult;
}

/** GET /api/health — which providers are usable right now. */
export interface HealthResponse {
  ok: boolean;
  mode: "live" | "no-keys";
  providers: {
    openai: boolean;
    deepseek: boolean;
    openrouter: boolean;
    /** App-run web search (Deep Debate for OpenAI/DeepSeek fighters). */
    webSearch: boolean;
  };
  timestamp: string;
}

export interface ApiErrorBody {
  error: {
    code: AppErrorCode;
    message: string;
  };
}
