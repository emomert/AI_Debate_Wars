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

/** Resolve which provider+model acts as judge. */
function resolveJudgeRef(session: DebateSession): { providerId: string; modelId: string } {
  const { judge } = session;
  switch (judge.mode) {
    case "modelA":
      return { providerId: session.modelA.providerId, modelId: session.modelA.modelId };
    case "modelB":
      return { providerId: session.modelB.providerId, modelId: session.modelB.modelId };
    case "thirdModel": {
      if (!judge.model) throw new ProviderError("INVALID_REQUEST", "No judge model chosen");
      if (!getModelById(judge.model.modelId)) {
        throw new ProviderError("INVALID_MODEL", "Unknown judge model");
      }
      return { providerId: judge.model.providerId, modelId: judge.model.modelId };
    }
    case "auto":
    default:
      return resolveAutoJudge();
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json()) as GenerateVerdictRequest;
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

    const judgeRef = resolveJudgeRef(session);
    const modelConfig = getProviderModelConfig(judgeRef.modelId, judgeRef.providerId as never);
    const provider = getProvider(modelConfig.providerId);

    const systemPrompt = JUDGE_SYSTEM_PROMPT;
    const userPrompt = buildJudgePrompt(session);
    const maxOutputTokens = Math.min(1000, modelConfig.maxOutputTokens);

    const result = await generateWithRetry(provider, {
      model: modelConfig,
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxOutputTokens,
      kind: "judge",
      timeoutMs: 120_000,
    });

    const parsed = parseVerdict(result.content, session.mode);
    const estimated = !result.usage;
    const usage =
      result.usage ??
      buildUsage(
        estimateTokensFromText(systemPrompt + userPrompt),
        estimateTokensFromText(result.content),
      );
    const cost = calculateCost(modelConfig.providerId, judgeRef.modelId, usage, estimated);

    const verdict: DebateVerdict = {
      id: createId("verdict"),
      sessionId: session.id,
      judgeModelId: judgeRef.modelId,
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
