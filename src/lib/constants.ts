/**
 * Static display metadata for the Setup screen selectors and Home samples.
 * These are pure data (no provider logic) and drive the arcade UI copy.
 */

import type { Locale } from "@/lib/i18n/config";
import type {
  DebateMode,
  DebatePace,
  DebateTone,
  JudgeMode,
  ResponseLength,
  RoundCount,
} from "@/lib/debate/debateTypes";

export interface ModeOption {
  id: DebateMode;
  title: string;
  tagline: string;
  description: string;
  modelARole: string;
  modelBRole: string;
  emoji: string;
}

export const MODE_OPTIONS: ModeOption[] = [
  {
    id: "debate",
    title: "Debate Mode",
    tagline: "Two sides enter. One stays standing.",
    description: "Two models take opposing stances and argue to win.",
    modelARole: "Pro side",
    modelBRole: "Against side",
    emoji: "⚔️",
  },
  {
    id: "discussion",
    title: "Discussion Mode",
    tagline: "Build it up, then stress-test it.",
    description: "Two models take complementary roles to improve your idea.",
    modelARole: "Supportive Strategist",
    modelBRole: "Critical Evaluator",
    emoji: "🧠",
  },
];

export interface RoundOption {
  count: RoundCount;
  label: string;
  blurb: string;
  /** Surfaced with a "Recommended" badge in the picker. */
  recommended?: boolean;
}

export const ROUND_OPTIONS: RoundOption[] = [
  { count: 3, label: "Quick Match", blurb: "Fast & punchy", recommended: true },
  { count: 5, label: "Ranked Match", blurb: "More back-and-forth" },
  // 7 avoids the word "Deep" so it never reads as the separate Deep Debate mode.
  { count: 7, label: "Championship", blurb: "Full tournament" },
];

export interface ToneOption {
  id: DebateTone;
  label: string;
  emoji: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  { id: "serious", label: "Serious", emoji: "🎯" },
  { id: "aggressive", label: "Aggressive", emoji: "🔥" },
  { id: "casual", label: "Casual", emoji: "😎" },
  { id: "custom", label: "Custom", emoji: "✏️" },
];

export const CUSTOM_TONE_MAX_LENGTH = 80;

export interface PaceOption {
  id: DebatePace;
  label: string;
  blurb: string;
  emoji: string;
}

export const PACE_OPTIONS: PaceOption[] = [
  { id: "manual", label: "Normal", blurb: "Click to reveal each turn", emoji: "🚶" },
  { id: "auto", label: "Fast", blurb: "Auto-plays every turn", emoji: "⚡" },
];

export interface LengthOption {
  id: ResponseLength;
  label: string;
  blurb: string;
  /** Surfaced with a "Recommended" badge in the picker. */
  recommended?: boolean;
}

export const LENGTH_OPTIONS: LengthOption[] = [
  { id: "short", label: "Short", blurb: "100–160 words", recommended: true },
  { id: "medium", label: "Medium", blurb: "180–300 words" },
  { id: "long", label: "Long", blurb: "350–600 words" },
];

export interface JudgeModeOption {
  id: JudgeMode;
  label: string;
  blurb: string;
  warns?: boolean;
}

// Only the two NEUTRAL judge options are offered. The "Model A / Model B
// judges" modes still exist in the JudgeMode type (for backward-compat with
// matches saved before this change) but are no longer selectable in the UI.
export const JUDGE_MODE_OPTIONS: JudgeModeOption[] = [
  { id: "auto", label: "Auto Judge", blurb: "Neutral third model picks a winner" },
  { id: "thirdModel", label: "Pick a Judge", blurb: "Choose a neutral third model" },
];

/**
 * Example topics shown on Home and Setup to lower the blank-page friction.
 * A short, curated set — each is a sharp, clearly two-sided claim that drops
 * straight into a great debate (no vague prompts, no in-jokes that only land
 * for some users). Quality over quantity: a few strong starters beat a long
 * scroll of filler.
 */
export const SAMPLE_TOPICS: string[] = [
  "Social media has done more harm than good.",
  "AI will create more jobs than it destroys.",
  "Remote work beats working from an office.",
  "Universities should ban AI writing tools.",
  "Humans will live on Mars within 50 years.",
  "Pineapple belongs on pizza.",
];

/** Turkish sample topics (shown on Home + Setup when the UI is in Turkish). */
export const SAMPLE_TOPICS_TR: string[] = [
  "Sosyal medya faydadan çok zarar getirdi.",
  "Yapay zekâ yok ettiğinden daha fazla iş yaratacak.",
  "Uzaktan çalışma, ofiste çalışmaktan daha iyidir.",
  "Üniversiteler yapay zekâ yazım araçlarını yasaklamalı.",
  "İnsanlar 50 yıl içinde Mars'ta yaşayacak.",
  "Ananas pizzanın üzerine yakışır.",
];

/** Sample topics for the active UI locale. */
export function getSampleTopics(locale: Locale): string[] {
  return locale === "tr" ? SAMPLE_TOPICS_TR : SAMPLE_TOPICS;
}

export const TOPIC_MIN_LENGTH = 8;
export const TOPIC_MAX_LENGTH = 280;
