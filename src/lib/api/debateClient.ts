/**
 * Client helper for the debate API routes. The UI calls these instead of ever
 * touching a provider directly — every real model call happens server-side.
 * Errors are surfaced as `ProviderError` with a normalized code the UI can map
 * to friendly copy.
 */

import type {
  ApiErrorBody,
  GenerateTurnResponse,
  GenerateVerdictResponse,
  HealthResponse,
  TopicCheckResponse,
} from "@/lib/api/contracts";
import type {
  DebateMessage,
  DebateSession,
  DebateVerdict,
} from "@/lib/debate/debateTypes";
import type { TopicCheckResult } from "@/lib/debate/topicCheck";
import { notifyCoinsChanged, notifyCoinsSpent } from "@/lib/coins/client";
import { matchCoinCost } from "@/lib/coins/economy";
import type { Locale } from "@/lib/i18n/config";
import { ProviderError, type AppErrorCode } from "@/lib/utils/errors";

async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let code: AppErrorCode = "UNKNOWN_ERROR";
    let message = "";
    try {
      const data = (await res.json()) as ApiErrorBody;
      code = data.error?.code ?? code;
      message = data.error?.message ?? "";
    } catch {
      /* non-JSON error body */
    }
    throw new ProviderError(code, message);
  }

  return (await res.json()) as T;
}

export async function generateTurn(
  session: DebateSession,
  turnId: string,
  signal?: AbortSignal,
): Promise<DebateMessage> {
  // The match is charged once, server-side, at the start of the FIRST turn's
  // request (ensureMatchCharged) — before any model work. Tell the header chip
  // now rather than after generation, or the balance appears to drop seconds
  // late. Every path (prefetch included) funnels through here, and each battle
  // in a multi-battle match charges separately, so each one fires on its own
  // first turn.
  const chargesNow = session.messages.length === 0;
  if (chargesNow) {
    notifyCoinsSpent(
      matchCoinCost({
        modelAId: session.modelA.modelId,
        modelBId: session.modelB.modelId,
        deepDebate: session.deepDebate,
        responseLength: session.responseLength,
      }),
    );
  }
  const data = await postJson<GenerateTurnResponse>(
    "/api/debate/turn",
    { session, turnId },
    signal,
  );
  // Replace the optimistic figure with the authoritative one.
  if (chargesNow) notifyCoinsChanged();
  return data.message;
}

export async function generateVerdict(
  session: DebateSession,
  signal?: AbortSignal,
): Promise<DebateVerdict> {
  const data = await postJson<GenerateVerdictResponse>(
    "/api/debate/verdict",
    { session },
    signal,
  );
  // A picked third-model judge is charged at the verdict route; Auto is free.
  // Re-read either way rather than guessing which resolved judge was used.
  notifyCoinsChanged();
  return data.verdict;
}

export async function checkTopic(
  topic: string,
  language: Locale,
  signal?: AbortSignal,
): Promise<TopicCheckResult> {
  const data = await postJson<TopicCheckResponse>(
    "/api/topic/check",
    { topic, language },
    signal,
  );
  return data.result;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch("/api/health", { signal });
  if (!res.ok) throw new ProviderError("UNKNOWN_ERROR", "health check failed");
  return (await res.json()) as HealthResponse;
}
