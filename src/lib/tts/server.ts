import "server-only";

/**
 * Server TTS provider — the PREMIUM voice tier (docs/21): OpenAI speech
 * (gpt-4o-mini-tts) on the SAME key the fighters already use, so voice needs
 * zero extra vendor setup. TTS_PROVIDER=none is the kill switch. With no
 * OpenAI key the app runs on the free Web Speech tier — this module is never
 * required for the app to work.
 */

import { ProviderError } from "@/lib/utils/errors";
import { TTS_COST_USD_PER_1M_CHARS } from "@/lib/cost/pricing";
import { OPENAI_VOICES } from "@/lib/tts/voices";
import type { Speaker } from "@/lib/debate/debateTypes";

const REQUEST_TIMEOUT_MS = 30_000;

/** Playback rate for the voices (OpenAI accepts 0.25–4.0; default a touch
 *  brisk so turns don't drag). Env-tunable without a redeploy of logic. */
function ttsSpeed(): number {
  const n = Number(process.env.TTS_SPEED);
  if (Number.isFinite(n) && n >= 0.25 && n <= 4) return n;
  return 1.15;
}

export function isServerTtsConfigured(): boolean {
  if (process.env.TTS_PROVIDER === "none") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

/** USD per 1M characters billed to the ledger/HUD (env-overridable). */
export function ttsCostUsdPer1MChars(): number {
  const override = Number(process.env.TTS_COST_USD_PER_1M);
  if (Number.isFinite(override) && override >= 0) return override;
  return TTS_COST_USD_PER_1M_CHARS;
}

export interface SynthesizedSpeech {
  audio: ArrayBuffer;
  contentType: string;
}

export async function synthesizeSpeech(
  text: string,
  speaker: Speaker,
  /** Optional delivery styling (gpt-4o-mini-tts only; legacy tts-1 rejects it). */
  instructions?: string,
): Promise<SynthesizedSpeech> {
  if (!isServerTtsConfigured()) {
    throw new ProviderError("INVALID_REQUEST", "Server TTS is not configured");
  }
  const model = process.env.TTS_OPENAI_MODEL ?? "gpt-4o-mini-tts";
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: text,
      voice: OPENAI_VOICES[speaker],
      response_format: "mp3",
      speed: ttsSpeed(),
      ...(instructions && !model.startsWith("tts-1") ? { instructions } : {}),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new ProviderError("PROVIDER_ERROR", `OpenAI TTS failed (${res.status})`);
  }
  return { audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
}
