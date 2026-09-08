import { claimGeneration, type GenerationClaim } from "@/lib/debate/generationStore";
import { withSpendBudget, hasReservedSpend } from "@/lib/security/spendBudget";
/**
 * POST /api/debate/verdict — generate the judge verdict (docs/06).
 *
 * Runs ONLY after every round is complete (the judge evaluates, never continues
 * the debate). Resolves which model judges based on the judge config:
 *   - thirdModel      → the chosen neutral model
 *   - auto            → the neutral model frozen when the match was created
 * Returns a structured, scored DebateVerdict.
 */

import { NextResponse } from "next/server";

import type {
  ApiErrorBody,
  GenerateVerdictRequest,
  GenerateVerdictResponse,
} from "@/lib/api/contracts";
import type { DebateVerdict } from "@/lib/debate/debateTypes";
import { JUDGE_SYSTEM_PROMPT, buildJudgePrompt } from "@/lib/debate/promptBuilder";
import { formatVerdictText, parseVerdict } from "@/lib/debate/verdictParser";
import {
  generateWithRetry,
  getProvider,
} from "@/lib/providers/providerRegistry";
import {
  getProviderModelConfig,
} from "@/lib/models/modelRegistry";
import { readJsonBody } from "@/lib/api/serverBody";
import { recordApiError } from "@/lib/analytics/errorLog";
import { assertTopicAllowed } from "@/lib/moderation/moderate";
import { enforceLimits } from "@/lib/security/rateLimit";
import { recordMatchAnalytics } from "@/lib/analytics/recordMatch";
import { buildSharePayload } from "@/lib/share/shareLink";
import { signSharePayload } from "@/lib/share/signing";
import {
  buildUsage,
  calculateCost,
  estimateTokensFromText,
} from "@/lib/cost/calculateCost";
import {
  httpStatusForCode,
  toAppError,
} from "@/lib/utils/errors";
import { createId } from "@/lib/utils/ids";
import { now } from "@/lib/utils/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The judge can be a slow reasoning model; same Vercel duration note as /turn.
export const maxDuration = 60;

export function POST(req: Request): Promise<NextResponse> {
  return withSpendBudget(req, () => handlePost(req));
}

async function handlePost(req: Request): Promise<NextResponse> {
  // Which judge the failed call targeted — read by the error log in the catch.
  let errModelId: string | undefined;
  let claim: GenerationClaim | undefined;
  try {
    await enforceLimits(req, "verdict", true);
    const deadlineMs = Date.now() + 55_000; // stay under Vercel maxDuration=60
    const body = await readJsonBody<GenerateVerdictRequest>(req);
    claim = await claimGeneration(body?.session);
    if (claim.cached) return NextResponse.json(claim.cached);
    const session = claim.session;
    const judgeModelId = claim.judgeModelId!;
    errModelId = judgeModelId;
    await assertTopicAllowed(session.topic, req.signal);

    const modelConfig = getProviderModelConfig(judgeModelId);
    const provider = getProvider(modelConfig.providerId);

    const systemPrompt = JUDGE_SYSTEM_PROMPT;
    const userPrompt = buildJudgePrompt(session);
    // The judge's VISIBLE budget (each provider adds its own hidden-thinking
    // headroom on top — +1300/+2000/+2500 by backend). 1000 was getting verdicts
    // cut off mid-JSON when a judge's uncapped thinking ate the whole budget;
    // this is a ceiling, not a target, so generous costs nothing when the JSON
    // is done in ~400 tokens. The parser additionally salvages any truncation.
    const maxOutputTokens = Math.min(2500, modelConfig.maxOutputTokens);

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

    // The judge evaluated BLIND — it only saw "Debater A" / "Debater B" (see
    // buildJudgePrompt). Now that judging is done, reveal the identities by
    // mapping those labels back to the real model names in the human-facing
    // text. The prompt pins the exact "Debater A/B" label, but models still
    // drift (hyphen, "Speaker", "Side", Turkish "Tartışmacı"), so the match is
    // deliberately broad to keep an anonymized label from ever reaching the UI.
    const sideLabel = (side: "A" | "B"): RegExp =>
      new RegExp(`\\b(?:Debater|Debaters|Speaker|Side|Tartışmacı|Münazaracı)[\\s\\-]*${side}\\b`, "gi");
    const deanonymize = (text: string): string =>
      text
        .replace(sideLabel("A"), session.modelA.displayName)
        .replace(sideLabel("B"), session.modelB.displayName);
    parsed.summary = deanonymize(parsed.summary);
    parsed.winnerArgument = deanonymize(parsed.winnerArgument);
    parsed.strongestModelA = deanonymize(parsed.strongestModelA);
    parsed.strongestModelB = deanonymize(parsed.strongestModelB);
    parsed.weakestModelA = deanonymize(parsed.weakestModelA);
    parsed.weakestModelB = deanonymize(parsed.weakestModelB);
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
      winnerArgument: parsed.winnerArgument || undefined,
      strongestModelA: parsed.strongestModelA,
      strongestModelB: parsed.strongestModelB,
      weakestModelA: parsed.weakestModelA,
      weakestModelB: parsed.weakestModelB,
      scoreModelA: parsed.scoreModelA,
      scoreModelB: parsed.scoreModelB,
      usage,
      cost,
      latencyMs: result.latencyMs,
      createdAt: now(),
    };

    // Sign the shareable verdict so a forged /s?d= link can't claim a fabricated
    // result (critical #2). Dormant until SHARE_SECRET is set. The payload mirrors
    // sharePayloadFromSession so /s + /api/og verify against the same canonical.
    const signature = await signSharePayload(
      buildSharePayload(
        session.topic,
        session.modelA.displayName,
        session.modelB.displayName,
        verdict,
      ),
    );
    if (signature) verdict.signature = signature;

    // Record the dimensions-only analytics card (no content) at the finalize
    // point — best-effort, uses the freshly-computed verdict. Never throws.
    await recordMatchAnalytics(session, {
      judgeModelId,
      verdictCost: cost.totalCost,
      winner: verdict.winner ?? null,
      scoreA: typeof verdict.scoreModelA === "number" ? verdict.scoreModelA : null,
      scoreB: typeof verdict.scoreModelB === "number" ? verdict.scoreModelB : null,
    });

    const res: GenerateVerdictResponse = { verdict };
    await claim.complete(res);
    return NextResponse.json(res);
  } catch (err) {
    await claim?.fail(!hasReservedSpend());
    await recordApiError("verdict", err, { modelId: errModelId }); // owner error log
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
