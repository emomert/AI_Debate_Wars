"use client";

/**
 * TopicInput — large playful topic box with sample chips, a live character
 * count, and an inline error/empty state.
 */

import { Badge } from "@/components/game/Badge";
import { SAMPLE_TOPICS, TOPIC_MAX_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

interface TopicInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function TopicInput({ value, onChange, error }: TopicInputProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="topic" className="font-heading text-lg font-extrabold">
          🎤 Your Topic
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
        placeholder="e.g. Should universities ban AI tools?"
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
          Quick examples
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_TOPICS.map((topic) => (
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

      {!error && value.trim().length === 0 ? (
        <p className="mt-3">
          <Badge color="white" size="sm">
            Empty arena — drop a topic in first
          </Badge>
        </p>
      ) : null}
    </div>
  );
}
