import "server-only";

/**
 * Server TTS provider — the PREMIUM voice tier (docs/21). Two engines behind
 * one synthesize call, pluggable by configuration like the search registry:
 *
 *  - "deepinfra": Kokoro-82M (~$0.80/1M chars) — cheapest, needs its own key
 *  - "openai":    gpt-4o-mini-tts (≈$15/1M-char equivalent) — reuses the
 *                 existing OPENAI_API_KEY, zero extra vendor setup
 *
 * Engine resolution (TTS_PROVIDER overrides): prefer DeepInfra when its key
 * exists (18× cheaper), else fall back to OpenAI's key. TTS_PROVIDER=none is
 * the kill switch. With nothing configured the app runs on the free Web
 * Speech tier — this module is never required for the app to work.
 */

import { ProviderError } from "@/lib/utils/errors";
import { TTS_PRICE_USD_PER_1M_CHARS } from "@/lib/cost/pricing";
import { KOKORO_VOICES, OPENAI_VOICES } from "@/lib/tts/voices";
import type { Speaker } from "@/lib/debate/debateTypes";

const DEEPINFRA_MODEL = "hexgrad/Kokoro-82M";
const REQUEST_TIMEOUT_MS = 30_000;

export type TtsEngine = keyof typeof TTS_PRICE_USD_PER_1M_CHARS;

/** Which engine would serve /api/tts right now (null → free tier only). */
export function resolveTtsEngine(): TtsEngine | null {
  const pref = process.env.TTS_PROVIDER;
  if (pref === "none") return null;
  if (pref === "deepinfra") return process.env.DEEPINFRA_API_KEY ? "deepinfra" : null;
  if (pref === "openai") return process.env.OPENAI_API_KEY ? "openai" : null;
  // Auto: cheapest configured engine wins.
  if (process.env.DEEPINFRA_API_KEY) return "deepinfra";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function isServerTtsConfigured(): boolean {
  return resolveTtsEngine() !== null;
}

/** USD per 1M characters for the ACTIVE engine (env-overridable). */
export function ttsCostUsdPer1MChars(): number {
  const override = Number(process.env.TTS_COST_USD_PER_1M);
  if (Number.isFinite(override) && override >= 0) return override;
  const engine = resolveTtsEngine();
  return engine ? TTS_PRICE_USD_PER_1M_CHARS[engine] : 0;
}

export interface SynthesizedSpeech {
  audio: ArrayBuffer;
  contentType: string;
}

export async function synthesizeSpeech(
  text: string,
  speaker: Speaker,
): Promise<SynthesizedSpeech> {
  const engine = resolveTtsEngine();
  if (!engine) {
    throw new ProviderError("INVALID_REQUEST", "Server TTS is not configured");
  }
  return engine === "openai"
    ? synthesizeOpenAi(text, OPENAI_VOICES[speaker])
    : synthesizeDeepInfra(text, KOKORO_VOICES[speaker]);
}

/* --------------------------------- OpenAI --------------------------------- */

async function synthesizeOpenAi(text: string, voice: string): Promise<SynthesizedSpeech> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.TTS_OPENAI_MODEL ?? "gpt-4o-mini-tts",
      input: text,
      voice,
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new ProviderError("PROVIDER_ERROR", `OpenAI TTS failed (${res.status})`);
  }
  return { audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
}

/* -------------------------------- DeepInfra ------------------------------- */

/**
 * DeepInfra exposes Kokoro two ways; try the stable OpenAI-compatible speech
 * endpoint first (raw audio bytes) and fall back to the native inference
 * endpoint (JSON with a base64 data-URI), so a change on their side degrades
 * gracefully instead of killing voice.
 */
async function synthesizeDeepInfra(text: string, voice: string): Promise<SynthesizedSpeech> {
  const headers = {
    Authorization: `Bearer ${process.env.DEEPINFRA_API_KEY}`,
    "Content-Type": "application/json",
  };

  // 1) OpenAI-compatible speech endpoint → raw audio bytes.
  try {
    const res = await fetch("https://api.deepinfra.com/v1/openai/audio/speech", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: DEEPINFRA_MODEL,
        input: text,
        voice,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        return { audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
      }
      const parsed = fromDataUri((await res.json()) as Record<string, unknown>);
      if (parsed) return parsed;
    }
  } catch {
    /* fall through to the native endpoint */
  }

  // 2) Native inference endpoint → JSON with base64 data-URI audio.
  const res = await fetch(
    `https://api.deepinfra.com/v1/inference/${DEEPINFRA_MODEL}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ text, preset_voice: [voice], output_format: "mp3" }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (res.ok) {
    const parsed = fromDataUri((await res.json()) as Record<string, unknown>);
    if (parsed) return parsed;
  }
  throw new ProviderError("PROVIDER_ERROR", `TTS synthesis failed (${res.status})`);
}

/** Parse DeepInfra's `audio: "data:audio/mp3;base64,…"` response shape. */
function fromDataUri(body: Record<string, unknown>): SynthesizedSpeech | null {
  const audio = body.audio;
  if (typeof audio !== "string") return null;
  const match = /^data:(audio\/[\w.+-]+);base64,(.+)$/.exec(audio);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  return {
    audio: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    contentType: match[1] === "audio/mp3" ? "audio/mpeg" : match[1],
  };
}
