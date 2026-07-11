/**
 * POST /api/topic/check — AI sanity-check / improve a proposed debate topic.
 *
 * A cheap, fast model (DeepSeek V4 Flash by default) reads the user's topic and
 * returns a verdict plus, when the topic is weak/unclear, sharper ready-to-use
 * alternatives. Server-side so keys never touch the browser. Like the debate
 * routes it is rate-limited and records its (tiny) spend against the daily cap.
 */

import { NextResponse } from "next/server";

import type {
  ApiErrorBody,
  TopicCheckRequest,
  TopicCheckResponse,
} from "@/lib/api/contracts";
import {
  TOPIC_CHECK_SYSTEM_PROMPT,
  buildTopicCheckPrompt,
  parseTopicCheck,
} from "@/lib/debate/topicCheck";
import { generateWithRetry, getProvider } from "@/lib/providers/providerRegistry";
import {
  getProviderModelConfig,
  type Backend,
} from "@/lib/models/modelRegistry";
import { readJsonBody } from "@/lib/api/serverBody";
import { recordApiError } from "@/lib/analytics/errorLog";
import { enforceLimits, recordSpend } from "@/lib/security/rateLimit";
import { moderateText } from "@/lib/moderation/moderate";
import {
  buildUsage,
  calculateCost,
  estimateTokensFromText,
} from "@/lib/cost/calculateCost";
import { TOPIC_MAX_LENGTH, TOPIC_MIN_LENGTH } from "@/lib/constants";
import {
  ProviderError,
  httpStatusForCode,
  toAppError,
} from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Quick single call; well under Vercel's Hobby cap.
export const maxDuration = 30;

/**
 * Pick the checker model: prefer DeepSeek V4 Flash (fast + cheap), then a cheap
 * OpenAI model, then a cheap OpenRouter model — whatever has a key configured.
 */
function resolveTopicCheckModel(): { providerId: Backend; modelId: string } {
  if (process.env.DEEPSEEK_API_KEY) {
    return { providerId: "deepseek", modelId: "deepseek-v4-flash" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { providerId: "openai", modelId: "gpt-4.1-mini" };
  }
  if (process.env.OPENROUTER_API_KEY) {
    // Cheapest capable model in the paid catalog (~$0.10/$0.28 per 1M).
    return { providerId: "openrouter", modelId: "xiaomi/mimo-v2.5" };
  }
  throw new ProviderError(
    "MISSING_API_KEY",
    "No provider is configured for topic checking",
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  // Which checker model the failed call targeted — read by the catch's error log.
  let errModelId: string | undefined;
  try {
    await enforceLimits(req, "topic");
    const deadlineMs = Date.now() + 25_000;
    const body = await readJsonBody<TopicCheckRequest>(req);

    const topic = (body?.topic ?? "").trim();
    if (topic.length < TOPIC_MIN_LENGTH) {
      throw new ProviderError("INVALID_REQUEST", "Topic is too short to check");
    }
    if (topic.length > TOPIC_MAX_LENGTH) {
      throw new ProviderError("INVALID_REQUEST", "Topic is too long");
    }
    const language = body?.language === "tr" ? "tr" : "en";

    // Early moderation gate: reject a disallowed topic with friendly arcade copy
    // BEFORE spending anything on the checker model. This is advisory (the topic
    // checker is optional from the UI); /api/debate/turn is the authoritative
    // block before any paid match work. Fails open (moderateText.checked=false).
    const moderation = await moderateText(topic, req.signal);
    if (moderation.flagged) {
      const blocked: TopicCheckResponse = {
        result: {
          verdict: "unclear",
          assessment:
            language === "tr"
              ? "Bu konu güvenlik filtremize takıldı ve arenada kullanılamaz. Farklı bir münazara konusu deneyin."
              : "This topic trips our safety filter and can't be used in the arena. Try a different debate topic.",
          suggestions: [],
        },
      };
      return NextResponse.json(blocked);
    }

    const { providerId, modelId } = resolveTopicCheckModel();
    errModelId = modelId;
    const modelConfig = getProviderModelConfig(modelId);
    const provider = getProvider(providerId);

    const systemPrompt = TOPIC_CHECK_SYSTEM_PROMPT;
    const userPrompt = buildTopicCheckPrompt(topic, language);

    const result = await generateWithRetry(
      provider,
      {
        model: modelConfig,
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxOutputTokens: Math.min(600, modelConfig.maxOutputTokens),
        kind: "judge",
        timeoutMs: 20_000,
        signal: req.signal,
      },
      2,
      deadlineMs,
    );

    const estimated = !result.usage;
    const usage =
      result.usage ??
      buildUsage(
        estimateTokensFromText(systemPrompt + userPrompt),
        estimateTokensFromText(result.content),
      );
    const cost = calculateCost(providerId, modelId, usage, estimated);
    await recordSpend(req, cost.totalCost);

    const res: TopicCheckResponse = { result: parseTopicCheck(result.content, topic) };
    return NextResponse.json(res);
  } catch (err) {
    await recordApiError("topic", err, { modelId: errModelId }); // owner error log
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
