/**
 * POST /api/tts — synthesize one debate message into speech (docs/21).
 *
 * Cost armor, in order and BEFORE any paid work (CLAUDE.md rule):
 *  1. 503 when no TTS provider is configured (client falls back to the free
 *     Web Speech tier — this route is never required for the app to work)
 *  2. per-IP rate limit (RL_TTS_PER_MIN) + daily spend caps
 *  3. text is sanitized server-side and hard-capped at MAX_TTS_CHARS, so a
 *     forged request can't buy more audio than a real turn produces.
 *
 * Returns raw audio bytes; the real cost rides along in X-Tts-Cost-Usd and is
 * recorded against the same daily spend ledger as model turns.
 */

import { NextResponse } from "next/server";

import { enforceLimits, recordSpend } from "@/lib/security/rateLimit";
import {
  isServerTtsConfigured,
  synthesizeSpeech,
  ttsCostUsdPer1MChars,
} from "@/lib/tts/server";
import { toSpeechText, truncateForSpeech } from "@/lib/tts/speechText";
import type { Speaker } from "@/lib/debate/debateTypes";
import { ProviderError, httpStatusForCode, toAppError } from "@/lib/utils/errors";
import type { ApiErrorBody } from "@/lib/api/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Above any real turn (long preset is 1200 tokens ≈ 3.6k chars). */
const MAX_TTS_CHARS = 4000;
/** Raw request body bound — rejects garbage before any work. */
const MAX_CONTENT_CHARS = 20_000;

const SPEAKERS: ReadonlySet<string> = new Set(["modelA", "modelB", "judge"]);

interface TtsRequest {
  content?: unknown;
  speaker?: unknown;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    if (!isServerTtsConfigured()) {
      throw new ProviderError("INVALID_REQUEST", "Server TTS is not configured");
    }
    await enforceLimits(req, "tts");

    const body = (await req.json().catch(() => null)) as TtsRequest | null;
    const content = body?.content;
    const speaker = body?.speaker;
    if (
      typeof content !== "string" ||
      content.trim() === "" ||
      content.length > MAX_CONTENT_CHARS ||
      typeof speaker !== "string" ||
      !SPEAKERS.has(speaker)
    ) {
      throw new ProviderError("INVALID_REQUEST", "Invalid TTS request");
    }

    const text = truncateForSpeech(toSpeechText(content), MAX_TTS_CHARS);
    if (text === "") {
      throw new ProviderError("INVALID_REQUEST", "Nothing speakable in content");
    }

    const { audio, contentType } = await synthesizeSpeech(text, speaker as Speaker);

    const costUsd = (text.length / 1_000_000) * ttsCostUsdPer1MChars();
    await recordSpend(req, costUsd);

    return new NextResponse(audio, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Tts-Cost-Usd": costUsd.toFixed(6),
        "X-Tts-Chars": String(text.length),
      },
    });
  } catch (err) {
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
