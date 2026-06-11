/**
 * Voice casting — which voice each arena role speaks with. Client-safe
 * constants shared by the /api/tts route (OpenAI voice ids) and the Web
 * Speech engine (pitch/rate differentiation when the device voice list is
 * too unpredictable to cast reliably).
 */

import type { Speaker } from "@/lib/debate/debateTypes";

/**
 * OpenAI speech voices (gpt-4o-mini-tts / tts-1). Fixed casting so every
 * match sounds consistent: Fighter A a deep male, Fighter B a warm female,
 * the judge a British male — instantly tellable apart even with eyes closed.
 */
export const OPENAI_VOICES: Record<Speaker, string> = {
  modelA: "onyx",
  modelB: "nova",
  judge: "fable",
};

/**
 * Delivery styling for gpt-4o-mini-tts (the `instructions` field): the match
 * tone shapes HOW the voice performs the turn, not just what it says. Custom
 * tones pass the user's own description through (sanitized server-side).
 */
export const VOICE_STYLE_BY_TONE: Record<string, string> = {
  serious:
    "Speak as a measured, confident debate champion: composed, precise, quietly intense.",
  aggressive:
    "Speak heatedly and combatively: fast, jabbing delivery with rising intensity, like a debater going for the knockout.",
  casual:
    "Speak relaxed and playful, like witty banter between friends — light, amused, unhurried.",
  unhinged:
    "Speak absolutely furious and contemptuous: seething, shouting-adjacent, dripping with disdain, right on the edge of losing it.",
};

export const JUDGE_VOICE_STYLE =
  "Speak as an authoritative debate judge delivering a verdict: deliberate, composed, courtroom gravitas.";

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
