/**
 * Voice casting — which voice each arena role speaks with. Client-safe
 * constants shared by the /api/tts route (Kokoro voice ids) and the Web
 * Speech engine (pitch/rate differentiation when the device voice list is
 * too unpredictable to cast reliably).
 */

import type { Speaker } from "@/lib/debate/debateTypes";

/**
 * Kokoro-82M preset voices (DeepInfra). Fixed casting so every match sounds
 * consistent: Fighter A an American male, Fighter B an American female, the
 * judge a British male — instantly tellable apart even with eyes closed.
 */
export const KOKORO_VOICES: Record<Speaker, string> = {
  modelA: "am_michael",
  modelB: "af_bella",
  judge: "bm_george",
};

/** Web Speech fallback: differentiate roles by pitch/rate + preferred names. */
export interface WebSpeechProfile {
  /** Case-insensitive name fragments tried against the device's voice list. */
  preferredNames: string[];
  pitch: number;
  rate: number;
}

export const WEB_SPEECH_PROFILES: Record<Speaker, WebSpeechProfile> = {
  modelA: {
    preferredNames: ["Google US English", "Microsoft Guy", "Microsoft David", "Daniel"],
    pitch: 0.9,
    rate: 1.02,
  },
  modelB: {
    preferredNames: ["Google UK English Female", "Microsoft Aria", "Microsoft Zira", "Samantha"],
    pitch: 1.15,
    rate: 1.0,
  },
  judge: {
    preferredNames: ["Google UK English Male", "Microsoft Ryan", "Microsoft George", "Arthur"],
    pitch: 0.78,
    rate: 0.95,
  },
};
