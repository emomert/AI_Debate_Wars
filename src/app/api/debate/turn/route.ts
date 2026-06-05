/**
 * POST /api/debate/turn — generate EXACTLY ONE AI turn (docs/06).
 *
 * This is the only place a model is called for a turn. It is server-side, so API
 * keys never touch the browser. The route:
 *   1. validates the incoming session,
 *   2. picks the model for the (app-chosen) turn,
 *   3. builds the prompt (promptBuilder),
 *   4. calls the provider via the registry (mock / openai / deepseek),
 *   5. computes cost from the configurable pricing table,
 *   6. returns one DebateMessage.
 * It never advances the debate or runs more than one turn.
 */

import { NextResponse } from "next/server";

import type {
  ApiErrorBody,
  GenerateTurnRequest,
  GenerateTurnResponse,
} from "@/lib/api/contracts";
import type { DebateMessage } from "@/lib/debate/debateTypes";
import {
  assertConsistentTranscript,
  assertValidSession,
} from "@/lib/debate/validators";
import {
  getNextTurn,
  getTurnById,
  speakerModel,
} from "@/lib/debate/orchestrator";
import {
  buildSystemPrompt,
  buildTurnPrompt,
  lengthPreset,
} from "@/lib/debate/promptBuilder";
import { generateWithRetry, getProvider } from "@/lib/providers/providerRegistry";
import { getProviderModelConfig } from "@/lib/models/modelRegistry";
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
// Reasoning models (DeepSeek/OpenRouter) can take 20-40s. Vercel's default is
// 10s; 60 is the Hobby cap (Pro/Enterprise can raise it up to 300+).
export const maxDuration = 60;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json()) as GenerateTurnRequest;
    const session = body?.session;
    assertValidSession(session);
    assertConsistentTranscript(session);

    const turn = getTurnById(session, body.turnId);
    if (!turn) throw new ProviderError("INVALID_REQUEST", "Unknown turn");
    if (turn.status === "complete") {
      throw new ProviderError("INVALID_REQUEST", "Turn already generated");
    }
    if (turn.speaker === "judge") {
      throw new ProviderError("INVALID_REQUEST", "Judge runs via /api/debate/verdict");
    }
    // The APP — not the request payload — controls order: only the next pending
    // turn may be generated, so every earlier turn must already be complete.
    const next = getNextTurn(session);
    if (!next || next.id !== turn.id) {
      throw new ProviderError("INVALID_REQUEST", "Turns must be generated in order");
    }

    const model = speakerModel(session, turn.speaker);
    const modelConfig = getProviderModelConfig(model.modelId);
    const provider = getProvider(modelConfig.providerId);

    const systemPrompt = buildSystemPrompt(session.mode);
    const userPrompt = buildTurnPrompt(session, turn);
    const preset = lengthPreset(session.responseLength);
    const maxOutputTokens = Math.min(preset.maxTokens, modelConfig.maxOutputTokens);

    const result = await generateWithRetry(provider, {
      model: modelConfig,
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxOutputTokens,
      kind: "turn",
      // Generous: DeepSeek/OpenRouter reasoning can take 20s+ on a cold first call.
      timeoutMs: 90_000,
    });

    const estimated = !result.usage;
    const usage =
      result.usage ??
      buildUsage(
        estimateTokensFromText(systemPrompt + userPrompt),
        estimateTokensFromText(result.content),
      );
    const cost = calculateCost(modelConfig.providerId, model.modelId, usage, estimated);

    const message: DebateMessage = {
      id: createId("msg"),
      sessionId: session.id,
      turnId: turn.id,
      speaker: turn.speaker,
      providerId: modelConfig.providerId,
      modelId: model.modelId,
      role: turn.role,
      stance: turn.stance,
      roundNumber: turn.roundNumber,
      roundLabel: turn.roundLabel,
      content: result.content,
      usage,
      cost,
      latencyMs: result.latencyMs,
      status: "complete",
      createdAt: now(),
    };

    const res: GenerateTurnResponse = { message };
    return NextResponse.json(res);
  } catch (err) {
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
