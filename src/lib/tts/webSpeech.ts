/**
 * Web Speech engine — the FREE voice tier (docs/21). Uses the browser's
 * built-in speechSynthesis with the known workarounds:
 *  - sentence chunking (desktop Chrome silently cuts ~250-char utterances)
 *  - distinct pitch/rate per role, plus preferred-voice casting where the
 *    device list cooperates
 *  - resolves (never rejects) on cancel/abort/unsupported, so voice can
 *    never break the match flow.
 */

import type { Speaker } from "@/lib/debate/debateTypes";
import { chunkForWebSpeech } from "@/lib/tts/speechText";
import { WEB_SPEECH_PROFILES } from "@/lib/tts/voices";

export function isWebSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** The voice list loads async in some browsers — wait briefly, then give up. */
function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const now = synth.getVoices();
    if (now.length > 0) return resolve(now);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", finish);
    setTimeout(finish, 1000);
  });
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  speaker: Speaker,
): SpeechSynthesisVoice | null {
  const profile = WEB_SPEECH_PROFILES[speaker];
  for (const fragment of profile.preferredNames) {
    const hit = voices.find((v) => v.name.toLowerCase().includes(fragment.toLowerCase()));
    if (hit) return hit;
  }
  // Deterministic spread over the english voices so A/B/judge differ when possible.
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;
  if (pool.length === 0) return null;
  const index = speaker === "modelA" ? 0 : speaker === "modelB" ? 1 : 2;
  return pool[Math.min(index, pool.length - 1)];
}

/**
 * Speak `text` as `speaker`. Resolves when speech finishes, is cancelled
 * (another speak/cancel call), aborted via `signal`, or isn't supported.
 */
export function speakWithWebSpeech(
  text: string,
  speaker: Speaker,
  signal?: AbortSignal,
): Promise<void> {
  if (!isWebSpeechAvailable() || text.trim() === "" || signal?.aborted) {
    return Promise.resolve();
  }
  const synth = window.speechSynthesis;
  synth.cancel(); // never overlap a previous speech

  return new Promise((resolve) => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const onAbort = () => {
      synth.cancel();
      finish();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    void getVoices().then((voices) => {
      if (cancelled || signal?.aborted) return finish();
      const profile = WEB_SPEECH_PROFILES[speaker];
      const voice = pickVoice(voices, speaker);
      const chunks = chunkForWebSpeech(text);

      let index = 0;
      const speakNext = () => {
        if (cancelled || signal?.aborted || index >= chunks.length) return finish();
        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        index += 1;
        if (voice) utterance.voice = voice;
        utterance.pitch = profile.pitch;
        utterance.rate = profile.rate;
        utterance.onend = speakNext;
        // An error on one chunk (interrupted, not-allowed, …) ends the speech
        // quietly rather than retry-looping.
        utterance.onerror = finish;
        synth.speak(utterance);
      };
      speakNext();
    });
  });
}

/** Stop any in-progress browser speech. */
export function cancelWebSpeech(): void {
  if (isWebSpeechAvailable()) window.speechSynthesis.cancel();
}
