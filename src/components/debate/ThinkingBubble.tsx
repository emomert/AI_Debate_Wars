"use client";

/**
 * ThinkingBubble — pulsing dots shown while the active fighter "thinks"
 * (docs/12). Decorative; the label carries the meaning for screen readers.
 */

import { cn } from "@/lib/utils/cn";
import type { ModelColor } from "@/lib/debate/debateTypes";

const DOT_COLOR: Record<ModelColor, string> = {
  blue: "bg-arcade-blue",
  red: "bg-arcade-red",
  yellow: "bg-arcade-yellow",
  purple: "bg-arcade-purple",
};

interface ThinkingBubbleProps {
  name: string;
  color?: ModelColor;
}

export function ThinkingBubble({ name, color = "blue" }: ThinkingBubbleProps) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-card border-3 border-ink bg-surface px-3 py-2 shadow-hard-sm"
      role="status"
    >
      <span className="flex items-end gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-2 w-2 rounded-full animate-thinking-bounce", DOT_COLOR[color])}
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      <span className="font-heading text-sm font-bold">{name} is thinking…</span>
    </div>
  );
}
