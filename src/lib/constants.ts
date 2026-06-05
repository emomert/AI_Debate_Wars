/**
 * Static display metadata for the Setup screen selectors and Home samples.
 * These are pure data (no provider logic) and drive the arcade UI copy.
 */

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
}

export const ROUND_OPTIONS: RoundOption[] = [
  { count: 3, label: "Quick Match", blurb: "Fast & punchy" },
  { count: 5, label: "Standard Match", blurb: "Balanced depth" },
  { count: 7, label: "Deep Match", blurb: "Full tournament" },
];

export interface ToneOption {
  id: DebateTone;
  label: string;
  emoji: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  { id: "serious", label: "Serious", emoji: "🎯" },
  { id: "academic", label: "Academic", emoji: "🎓" },
  { id: "aggressive", label: "Aggressive", emoji: "🔥" },
  { id: "casual", label: "Casual", emoji: "😎" },
];

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
}

export const LENGTH_OPTIONS: LengthOption[] = [
  { id: "short", label: "Short", blurb: "100–160 words" },
  { id: "medium", label: "Medium", blurb: "180–300 words" },
  { id: "long", label: "Long", blurb: "350–600 words" },
];

export interface JudgeModeOption {
  id: JudgeMode;
  label: string;
  blurb: string;
  warns?: boolean;
}

export const JUDGE_MODE_OPTIONS: JudgeModeOption[] = [
  { id: "auto", label: "Auto Judge", blurb: "Neutral third model picks a winner" },
  { id: "thirdModel", label: "Pick a Judge", blurb: "Choose a neutral third model" },
  {
    id: "modelA",
    label: "Model A Judges",
    blurb: "Less neutral — A was in the fight",
    warns: true,
  },
  {
    id: "modelB",
    label: "Model B Judges",
    blurb: "Less neutral — B was in the fight",
    warns: true,
  },
];

/** Example topics shown on Home and Setup to lower the blank-page friction. */
export const SAMPLE_TOPICS: string[] = [
  "Should universities ban AI tools?",
  "Is remote work better than office work?",
  "Should Turkey invest more in nuclear energy?",
  "Evaluate my startup idea: a food-waste marketplace for restaurants.",
  "Does AI regulation slow down innovation?",
  "Is a 4-day work week good for the economy?",
];

export const TOPIC_MIN_LENGTH = 8;
export const TOPIC_MAX_LENGTH = 280;
