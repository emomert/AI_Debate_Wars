"use client";

/**
 * SourcesList — collapsible, arcade-styled list of cited web sources for a Deep
 * Debate turn (and reused on the results page). Numbered [n] rows with external
 * links, the source domain, and an optional quoted excerpt.
 */

import { useState } from "react";

import type { Citation } from "@/lib/debate/debateTypes";
import { Badge } from "@/components/game/Badge";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/LocaleProvider";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

interface SourcesListProps {
  citations: Citation[];
  defaultOpen?: boolean;
  label?: string;
  className?: string;
}

export function SourcesList({
  citations,
  defaultOpen = false,
  label,
  className,
}: SourcesListProps) {
  const d = useT();
  const resolvedLabel = label ?? d.debate.sources.label;
  const [open, setOpen] = useState(defaultOpen);
  if (!citations || citations.length === 0) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-badge border-3 border-ink bg-night px-2.5 py-1 font-mono text-[11px] font-bold text-white transition hover:bg-night/80 focus-visible:outline-3 focus-visible:outline-offset-2"
      >
        <span aria-hidden>📚</span>
        <span>
          {resolvedLabel} · {citations.length}
        </span>
        <span aria-hidden className="text-white/60">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <>
        <ol className="mt-2 space-y-2 rounded-card border-3 border-ink bg-surface p-3">
          {citations.map((c) => {
            const domain = domainOf(c.url);
            return (
              <li key={`${c.index}-${c.url}`} className="flex gap-2 text-xs">
                <span className="mt-0.5 shrink-0 rounded-[4px] border-2 border-ink bg-night px-1 font-mono text-[10px] font-bold text-arcade-yellow">
                  {c.index}
                </span>
                <div className="min-w-0">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-arcade-blue underline decoration-2 underline-offset-2 hover:text-arcade-purple"
                  >
                    {c.title}
                  </a>
                  {domain ? (
                    <span className="ml-1.5 align-middle">
                      <Badge color="white" size="sm">
                        {domain}
                      </Badge>
                    </span>
                  ) : null}
                  {c.quote ? (
                    <blockquote className="mt-1 border-l-4 border-dashed border-ink/40 pl-2 text-ink/65">
                      “{c.quote}”
                    </blockquote>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {/* Brave attribution (P0-9): injected web search is Brave by default
            (DEEP_SEARCH_MODE=unified); displaying its name is required to keep
            Brave's API terms/credit. In hybrid mode some citations come from a
            fighter's native search, but the default config is Brave. */}
        <a
          href="https://search.brave.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wide text-ink/55 transition hover:text-ink"
        >
          <span aria-hidden>🔎</span>
          {d.debate.sources.attribution}
        </a>
        </>
      ) : null}
    </div>
  );
}

/** Merge + de-dupe citations across many messages (for the results Sources tab). */
export function mergeCitations(lists: (Citation[] | undefined)[]): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const c of list ?? []) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      out.push({ ...c, index: out.length + 1 });
    }
  }
  return out;
}

export { domainOf };
