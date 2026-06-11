import "server-only";

/**
 * Server TTS provider — the PREMIUM voice tier (docs/21): Kokoro-82M served
 * by DeepInfra at ~$0.80 per 1M characters. Pluggable by configuration like
 * the search registry: TTS_PROVIDER=none disables it even with a key set,
 * and with no key the app silently runs on the free Web Speech tier.
 *
 * DeepInfra exposes the model two ways; we try the stable OpenAI-compatible
 * speech endpoint first (raw audio bytes) and fall back to the native
 * inference endpoint (JSON with a base64 data-URI), so a change on their
 * side degrades gracefully instead of killing voice.
 */

import { ProviderError } from "@/lib/utils/errors";

const DEEPINFRA_MODEL = "hexgrad/Kokoro-82M";
const REQUEST_TIMEOUT_MS = 30_000;

export function isServerTtsConfigured(): boolean {
  if ((process.env.TTS_PROVIDER ?? "deepinfra") === "none") return false;
  return Boolean(process.env.DEEPINFRA_API_KEY);
}

export interface SynthesizedSpeech {
  audio: ArrayBuffer;
  contentType: string;
}

export async function synthesizeSpeech(
  text: string,
  voice: string,
): Promise<SynthesizedSpeech> {
  const apiKey = process.env.DEEPINFRA_API_KEY;
  if (!apiKey || !isServerTtsConfigured()) {
    throw new ProviderError("INVALID_REQUEST", "Server TTS is not configured");
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
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
