"use client";

/**
 * TopicInput — large playful topic box with sample chips, a live character
 * count, and an inline error state.
 */

import { getSampleTopics, TOPIC_MAX_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";

interface TopicInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function TopicInput({ value, onChange, error }: TopicInputProps) {
  const d = useT();
  const { locale } = useLocale();
  const sampleTopics = getSampleTopics(locale);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="topic" className="font-heading text-lg font-extrabold">
          {d.setup.topic.label}
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
        placeholder={d.setup.topic.placeholder}
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

      <div className="mt-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/50">
          {d.setup.topic.quickExamples}
        </p>
        <div className="flex flex-wrap gap-2">
          {sampleTopics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => onChange(topic)}
              className="rounded-badge border-3 border-ink bg-surface px-2.5 py-1 text-left text-xs font-semibold transition hover:bg-arcade-yellow hover:text-night focus-visible:outline-3 focus-visible:outline-offset-2"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
