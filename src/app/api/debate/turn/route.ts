import { claimGeneration, type GenerationClaim } from "@/lib/debate/generationStore";
import { withSpendBudget, hasReservedSpend } from "@/lib/security/spendBudget";
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
 * The server saves the completed turn; the browser controls its presentation.
 */

import { NextResponse } from "next/server";

import type {
  ApiErrorBody,
  GenerateTurnRequest,
  GenerateTurnResponse,
} from "@/lib/api/contracts";
import type { Citation, DebateMessage } from "@/lib/debate/debateTypes";
import {
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
import { recordApiError } from "@/lib/analytics/errorLog";
import {
  enforceLimits,
  enforceSearchBudget,
} from "@/lib/security/rateLimit";
import { assertTopicAllowed } from "@/lib/moderation/moderate";
import { parseMove } from "@/lib/debate/parseMove";
import { stripEchoedHeading } from "@/lib/debate/turnText";
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
// Keep the explicit route deadline aligned with provider retries and leases.
export const maxDuration = 60;

export function POST(req: Request): Promise<NextResponse> {
  return withSpendBudget(req, () => handlePost(req));
}

async function handlePost(req: Request): Promise<NextResponse> {
  // Which model the failed call targeted — set once resolved, read by the
  // error log in the catch (owner dashboard: spot models that keep failing).
  let errModelId: string | undefined;
  let claim: GenerationClaim | undefined;
  try {
    // Cost/abuse guard FIRST: cheaply reject floods + enforce the daily spend
    // cap before doing any paid work (rate limit + spend caps, per IP).
    await enforceLimits(req, "turn", true);
    // Keep total work under Vercel's maxDuration=60 (return a clean JSON error
    // before the platform kills the function with an opaque 502/504).
    const deadlineMs = Date.now() + 55_000;
    const body = await readJsonBody<GenerateTurnRequest>(req);
    if (typeof body?.turnId !== "string") throw new ProviderError("INVALID_REQUEST", "Missing turn ID");
    claim = await claimGeneration(body.session, body.turnId);
    if (claim.cached) return NextResponse.json(claim.cached);
    const session = claim.session;
    const turn = getTurnById(session, body.turnId)!;
    await assertTopicAllowed(session.topic, req.signal);

    const model = speakerModel(session, turn.speaker);
    errModelId = model.modelId;
    const modelConfig = getProviderModelConfig(model.modelId);
    const provider = getProvider(modelConfig.providerId);

    // Deep Debate uses metered app-managed search and a longer fixed template.
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
      // Hard daily query cap (P0-9): Brave is metered with no overage cap, so a
      // count-based backstop gates each search before it's billed.
      await enforceSearchBudget();
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
    const systemPrompt = buildSystemPrompt(
      session.mode,
      deep,
      deepSourcesAvailable,
      session.language ?? "en",
    );
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

    // Blitz: pull the leading move tag off the model's reply, strip it from the
    // shown text, and attach it to the message so the stage can fire a splash.
    // Non-blitz sessions are untouched. Unknown/missing tag → move stays undefined.
    let move: DebateMessage["move"];
    if (session.mode === "blitz") {
      const parsed = parseMove(content);
      content = parsed.content;
      move = parsed.move ?? undefined;
    } else {
      // Some models open with a title echoing the round/side ("Opening
      // Arguments — Pro Side") despite the prompt forbidding it — strip it.
      content = stripEchoedHeading(content, turn.roundLabel);
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
      move,
      usage,
      cost,
      citations,
      latencyMs: result.latencyMs,
      status: "complete",
      createdAt: now(),
    };

    const res: GenerateTurnResponse = { message };
    await claim.complete(res);
    return NextResponse.json(res);
  } catch (err) {
    await claim?.fail(!hasReservedSpend());
    await recordApiError("turn", err, { modelId: errModelId }); // owner error log
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
