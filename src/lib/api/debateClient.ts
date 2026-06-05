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
} from "@/lib/api/contracts";
import type {
  DebateMessage,
  DebateSession,
  DebateVerdict,
} from "@/lib/debate/debateTypes";
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
  const data = await postJson<GenerateTurnResponse>(
    "/api/debate/turn",
    { session, turnId },
    signal,
  );
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
  return data.verdict;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch("/api/health", { signal });
  if (!res.ok) throw new ProviderError("UNKNOWN_ERROR", "health check failed");
  return (await res.json()) as HealthResponse;
}
