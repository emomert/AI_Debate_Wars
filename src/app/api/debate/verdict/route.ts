/**
 * POST /api/debate/verdict — generate the judge verdict (docs/06).
 *
 * Runs ONLY after every round is complete (the judge evaluates, never continues
 * the debate). Resolves which model judges based on the judge config:
 *   - modelA / modelB → that fighter (may be biased; UI warns at setup)
 *   - thirdModel      → the chosen neutral model
 *   - auto            → a neutral model based on which API keys are present
 * Returns a structured, scored DebateVerdict.
 */

import { NextResponse } from "next/server";

import type {
  ApiErrorBody,
  GenerateVerdictRequest,
  GenerateVerdictResponse,
} from "@/lib/api/contracts";
import type { DebateSession, DebateVerdict } from "@/lib/debate/debateTypes";
import {
  assertConsistentTranscript,
  assertValidSession,
} from "@/lib/debate/validators";
import { isDebateComplete } from "@/lib/debate/orchestrator";
import { JUDGE_SYSTEM_PROMPT, buildJudgePrompt } from "@/lib/debate/promptBuilder";
import { formatVerdictText, parseVerdict } from "@/lib/debate/verdictParser";
import {
  generateWithRetry,
  getProvider,
  resolveAutoJudge,
} from "@/lib/providers/providerRegistry";
import {
  getModelById,
  getProviderModelConfig,
} from "@/lib/models/modelRegistry";
import { readJsonBody } from "@/lib/api/serverBody";
import {
  buildUsage,
  calculateCost,
  estimateTokensFromText,
} from "@/lib/cost/calculateCost";
import {
  ProviderError,
  httpStatusForCode,
  toAppError,
} from "@/lib/utils/errors";
import { createId } from "@/lib/utils/ids";
import { now } from "@/lib/utils/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The judge can be a slow reasoning model; same Vercel duration note as /turn.
export const maxDuration = 60;

/**
 * Resolve which model acts as judge. Only the modelId is load-bearing — the
 * real backend is derived from the catalog by getProviderModelConfig — so we
 * return just the id (no provider-id type laundering / `as never`).
 */
function resolveJudgeModelId(session: DebateSession): string {
  const { judge } = session;
  switch (judge.mode) {
    case "modelA":
      return session.modelA.modelId;
    case "modelB":
      return session.modelB.modelId;
    case "thirdModel": {
      if (!judge.model) throw new ProviderError("INVALID_REQUEST", "No judge model chosen");
      if (!getModelById(judge.model.modelId)) {
        throw new ProviderError("INVALID_MODEL", "Unknown judge model");
      }
      return judge.model.modelId;
    }
    case "auto":
    default:
      return resolveAutoJudge(session).modelId;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const deadlineMs = Date.now() + 55_000; // stay under Vercel maxDuration=60
    const body = await readJsonBody<GenerateVerdictRequest>(req);
    const session = body?.session;
    assertValidSession(session);
    assertConsistentTranscript(session);

    if (!session.judge.enabled) {
      throw new ProviderError("INVALID_REQUEST", "Judge mode is disabled");
    }
    if (!isDebateComplete(session)) {
      throw new ProviderError("INVALID_REQUEST", "Debate is not complete yet");
    }
    // With a consistent transcript + a complete debate, this also guarantees a
    // non-empty transcript (messages === turns), so the judge never evaluates an
    // empty debate.
    if (session.messages.length === 0) {
      throw new ProviderError("INVALID_REQUEST", "Debate transcript is empty");
    }

    const judgeModelId = resolveJudgeModelId(session);
    const modelConfig = getProviderModelConfig(judgeModelId);
    const provider = getProvider(modelConfig.providerId);

    const systemPrompt = JUDGE_SYSTEM_PROMPT;
    const userPrompt = buildJudgePrompt(session);
    const maxOutputTokens = Math.min(1000, modelConfig.maxOutputTokens);

    const result = await generateWithRetry(
      provider,
      {
        model: modelConfig,
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        maxOutputTokens,
        kind: "judge",
        timeoutMs: 50_000,
        signal: req.signal,
      },
      3,
      deadlineMs,
    );

    const parsed = parseVerdict(
      result.content,
      session.mode,
      session.modelA.displayName,
      session.modelB.displayName,
    );
    const estimated = !result.usage;
    const usage =
      result.usage ??
      buildUsage(
        estimateTokensFromText(systemPrompt + userPrompt),
        estimateTokensFromText(result.content),
      );
    const cost = calculateCost(modelConfig.providerId, judgeModelId, usage, estimated);

    const verdict: DebateVerdict = {
      id: createId("verdict"),
      sessionId: session.id,
      judgeModelId,
      content: formatVerdictText(parsed, session.modelA.displayName, session.modelB.displayName),
      winner: parsed.winner,
      summary: parsed.summary,
      strongestModelA: parsed.strongestModelA,
      strongestModelB: parsed.strongestModelB,
      weakestModelA: parsed.weakestModelA,
      weakestModelB: parsed.weakestModelB,
      practicalConclusion: parsed.practicalConclusion || undefined,
      scoreModelA: parsed.scoreModelA,
      scoreModelB: parsed.scoreModelB,
      usage,
      cost,
      latencyMs: result.latencyMs,
      createdAt: now(),
    };

    const res: GenerateVerdictResponse = { verdict };
    return NextResponse.json(res);
  } catch (err) {
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
