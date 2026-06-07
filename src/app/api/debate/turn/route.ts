/**
 * POST /api/debate/turn — generate EXACTLY ONE AI turn (docs/06).
 *
 * This is the only place a model is called for a turn. It is server-side, so API
 * keys never touch the browser. The route:
 *   1. validates the incoming session,
 *   2. picks the model for the (app-chosen) turn,
 *   3. builds the prompt (promptBuilder),
 *   4. calls the provider via the registry (openai / deepseek / openrouter),
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
import type { Citation, DebateMessage } from "@/lib/debate/debateTypes";
import {
  assertConsistentTranscript,
  assertDeepTurnAllowed,
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
import {
  deepSearchStrategy,
  getProviderModelConfig,
} from "@/lib/models/modelRegistry";
import {
  getSearchProvider,
  injectedSearchCostUsd,
} from "@/lib/search/searchRegistry";
import { readJsonBody } from "@/lib/api/serverBody";
import {
  DEEP_SEARCH_COST_USD,
  narrowCitationsToCited,
  stripOrphanCitationMarkers,
} from "@/lib/debate/citations";
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
    // Keep total work under Vercel's maxDuration=60 (return a clean JSON error
    // before the platform kills the function with an opaque 502/504).
    const deadlineMs = Date.now() + 55_000;
    const body = await readJsonBody<GenerateTurnRequest>(req);
    const session = body?.session;
    assertValidSession(session);
    assertDeepTurnAllowed(session);
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

    // Deep Debate: web search + fixed longer template. By default every turn
    // uses the app-run search (search registry, e.g. Brave) injected into the
    // prompt; DEEP_SEARCH_MODE=hybrid routes OpenRouter fighters through their
    // native ":online" search instead.
    const deep = session.deepDebate;
    const searchMode = deep ? deepSearchStrategy(model.modelId) : null;
    const nativeSearch = searchMode === "native";

    let injectedSources: Citation[] | undefined;
    if (searchMode === "injected") {
      const search = getSearchProvider();
      if (!search.isConfigured()) {
        // Validated already, but guard anyway.
        throw new ProviderError(
          "MISSING_API_KEY",
          "Web search is not configured on the server (BRAVE_SEARCH_API_KEY)",
        );
      }
      injectedSources = await search.search(session.topic, {
        count: 5,
        timeoutMs: 10_000,
        signal: req.signal,
      });
    }

    // Native search presumes sources (the provider attaches them itself); the
    // injected path knows: an empty result set switches the prompts to the
    // no-sources variant so the model isn't told to cite what it doesn't have.
    const deepSourcesAvailable = !injectedSources || injectedSources.length > 0;
    const systemPrompt = buildSystemPrompt(session.mode, deep, deepSourcesAvailable);
    const userPrompt = buildTurnPrompt(session, turn, injectedSources);
    const maxTokensTarget = deep ? 1500 : lengthPreset(session.responseLength).maxTokens;
    const maxOutputTokens = Math.min(maxTokensTarget, modelConfig.maxOutputTokens);

    const result = await generateWithRetry(
      provider,
      {
        model: modelConfig,
        systemPrompt,
        userPrompt,
        temperature: 0.8,
        maxOutputTokens,
        kind: "turn",
        webSearch: nativeSearch,
        // Per-attempt cap; generateWithRetry further clamps it to the remaining
        // deadline budget so the whole call finishes before maxDuration. Deep
        // turns get the near-full budget in ONE attempt (search + long answer).
        timeoutMs: deep ? 52_000 : 50_000,
        // Abort the upstream provider call if the client disconnects (Stop /
        // navigation), so we don't keep billing a turn nobody is waiting for.
        signal: req.signal,
      },
      deep ? 1 : 3,
      deadlineMs,
    );

    const estimated = !result.usage;
    const usage =
      result.usage ??
      buildUsage(
        estimateTokensFromText(systemPrompt + userPrompt),
        estimateTokensFromText(result.content),
      );
    const cost = calculateCost(modelConfig.providerId, model.modelId, usage, estimated);

    // Deep Debate: keep sources, strip any hallucinated [n] markers, and add the
    // web-search fee so the cost display reflects what was actually billed.
    // (Injected search with zero results → no citations, and the orphan strip
    // with count 0 removes every [n] marker, matching the prompt instruction.)
    let citations = nativeSearch
      ? result.citations
      : injectedSources && injectedSources.length > 0
        ? injectedSources
        : undefined;
    let content = deep
      ? stripOrphanCitationMarkers(result.content, citations)
      : result.content;
    if (searchMode === "injected" && citations) {
      // Only claim the sources the model actually cited (native annotations
      // already carry that meaning; the injected list is what we PROVIDED).
      ({ content, citations } = narrowCitationsToCited(content, citations));
    }
    if (nativeSearch) {
      cost.searchCost = DEEP_SEARCH_COST_USD;
      cost.totalCost += DEEP_SEARCH_COST_USD;
    } else if (searchMode === "injected") {
      const fee = injectedSearchCostUsd();
      if (fee > 0) {
        cost.searchCost = fee;
        cost.totalCost += fee;
      }
    }

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
      content,
      usage,
      cost,
      citations,
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
