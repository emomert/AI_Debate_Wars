"use client";

/**
 * TopicInput — large playful topic box with sample chips, a live character
 * count, an inline error state, and an AI "Improve my topic" helper.
 *
 * The helper sends the topic to a cheap fast model (server route /api/topic/check)
 * that judges whether it's a strong, two-sided debate topic and — when it isn't —
 * suggests sharper ready-to-use alternatives the user can apply with one tap.
 */

import { useEffect, useRef, useState } from "react";

import {
  getSampleTopics,
  pickSampleTopics,
  TOPIC_MAX_LENGTH,
  TOPIC_MIN_LENGTH,
} from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/game/Badge";
import { checkTopic } from "@/lib/api/debateClient";
import type { TopicCheckResult } from "@/lib/debate/topicCheck";
import type { ProviderAvailability } from "@/lib/state/ArenaContext";
import { playSound } from "@/lib/audio/soundManager";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";

interface TopicInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Which providers have keys — gates the AI helper (null = optimistic). */
  availability?: ProviderAvailability | null;
}

export function TopicInput({ value, onChange, error, availability }: TopicInputProps) {
  const d = useT();
  const t = d.setup.topic;
  const { locale } = useLocale();
  // A fresh shuffled handful of examples each visit (SSR-stable initial slice,
  // reshuffled on mount to avoid a hydration mismatch).
  const [sampleTopics, setSampleTopics] = useState<string[]>(() =>
    getSampleTopics(locale).slice(0, 6),
  );
  useEffect(() => {
    setSampleTopics(pickSampleTopics(locale, 6));
  }, [locale]);

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<TopicCheckResult | null>(null);
  const [checkError, setCheckError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight check on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  // The helper needs at least one provider key. `availability` is null until
  // /api/health resolves, so stay optimistic and show the button until proven
  // otherwise.
  const helperAvailable =
    !availability ||
    availability.openai ||
    availability.deepseek ||
    availability.openrouter;

  const canCheck = value.trim().length >= TOPIC_MIN_LENGTH && !checking;

  const runCheck = async () => {
    if (!canCheck) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setChecking(true);
    setCheckError(false);
    setResult(null);
    playSound("buttonClick");
    try {
      const res = await checkTopic(value.trim(), locale, controller.signal);
      if (!controller.signal.aborted) setResult(res);
    } catch {
      if (!controller.signal.aborted) setCheckError(true);
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    playSound("buttonClick");
    onChange(suggestion);
    setResult(null);
    setCheckError(false);
  };

  const verdictBadge =
    result?.verdict === "good"
      ? { color: "green" as const, label: t.verdictStrong }
      : result?.verdict === "unclear"
        ? { color: "orange" as const, label: t.verdictUnclear }
        : { color: "orange" as const, label: t.verdictWeak };

  return (
    <div>
      {/* "Improve my topic" — a tilted sticker pinned to the panel's top-right
          corner (anchors to the relative GamePanel; flat, no drop shadow). */}
      {helperAvailable ? (
        <button
          type="button"
          onClick={runCheck}
          disabled={!canCheck}
          aria-label={t.check}
          className={cn(
            "absolute -right-2 -top-3 z-20 rotate-6 rounded-btn border-3 border-ink bg-arcade-purple px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white transition",
            "focus-visible:outline-3 focus-visible:outline-offset-2",
            canCheck
              ? "hover:-rotate-2 hover:bg-arcade-purple/90"
              : "cursor-not-allowed opacity-50 grayscale",
          )}
        >
          {checking ? t.checking : t.check}
        </button>
      ) : null}

      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="topic" className="font-heading text-lg font-extrabold">
          {t.label}
        </label>
        <span
          className={cn(
            "font-mono text-xs",
            value.length > TOPIC_MAX_LENGTH ? "text-arcade-red" : "text-ink/50",
          )}
        >
          {value.length}/{TOPIC_MAX_LENGTH}
        </span>
      </div>

      <textarea
        id="topic"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={TOPIC_MAX_LENGTH + 40}
        placeholder={t.placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "topic-error" : undefined}
        className={cn(
          "w-full resize-none rounded-card border-4 bg-paper px-4 py-3 font-body text-base outline-none",
          "placeholder:text-ink/35 focus-visible:outline-3 focus-visible:outline-offset-2",
          error ? "border-arcade-red" : "border-ink",
        )}
      />

      {error ? (
        <p id="topic-error" className="mt-2 font-heading text-sm font-bold text-arcade-red">
          {error}
        </p>
      ) : null}

      {/* AI topic helper — the trigger button is a tilted corner sticker (added
          near the top of this component); here we only render its results. */}
      {helperAvailable ? (
        <div className="mt-3">
          {checkError ? (
            <p className="mt-2 text-sm font-bold text-arcade-red">{t.checkError}</p>
          ) : null}

          {result ? (
            <div className="mt-2 rounded-card border-3 border-ink bg-surface p-3 shadow-hard-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={verdictBadge.color} size="sm">
                    {verdictBadge.label}
                  </Badge>
                  {result.assessment ? (
                    <span className="text-sm text-ink/75">{result.assessment}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="shrink-0 rounded-btn border-2 border-ink/30 px-1.5 text-[11px] font-bold text-ink/55 transition hover:border-ink hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2"
                >
                  {t.dismiss}
                </button>
              </div>

              {result.suggestions.length > 0 ? (
                <div className="mt-2.5">
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink/50">
                    {t.suggestionsLabel}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {result.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => applySuggestion(s)}
                        aria-label={t.useSuggestionAria(s)}
                        className="rounded-btn border-3 border-ink bg-paper px-2.5 py-1.5 text-left text-sm font-semibold transition hover:bg-arcade-yellow hover:text-night focus-visible:outline-3 focus-visible:outline-offset-2"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/50">
          {t.quickExamples}
        </p>
        <div className="flex flex-wrap gap-2">
          {sampleTopics.map((topic, i) => (
            <button
              key={topic}
              type="button"
              onClick={() => onChange(topic)}
              className={cn(
                "rounded-badge border-3 border-ink bg-surface px-2.5 py-1 text-left text-xs font-semibold transition hover:bg-arcade-yellow hover:text-night focus-visible:outline-3 focus-visible:outline-offset-2",
                // Keep the phone list short — show the first 4, reveal the rest from sm up.
                i >= 4 ? "hidden sm:inline-block" : "inline-block",
              )}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
