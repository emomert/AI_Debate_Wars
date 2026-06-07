"use client";

/**
 * DeepDebateToggle — the Deep Debate capability switch (NOT a tone). When on,
 * fighters web-search, cite sources, follow a fixed longer template, and turns
 * take noticeably longer. Styled like JudgeSelector's enable card, with a
 * premium purple accent + "DEEP" sticker so it reads as a distinct mode.
 */

import { Badge } from "@/components/game/Badge";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/audio/soundManager";

interface DeepDebateToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  /** True when both fighters can deep-search (natively or via the app's search engine). */
  fightersEligible: boolean;
}

export function DeepDebateToggle({
  value,
  onChange,
  fightersEligible,
}: DeepDebateToggleProps) {
  return (
    <div>
      <div
        className={cn(
          "relative flex items-center justify-between gap-3 rounded-card border-4 border-ink p-3 shadow-hard-sm transition-colors",
          value ? "bg-arcade-purple text-white" : "bg-surface",
        )}
      >
        <div className="min-w-0">
          <p className="font-heading text-base font-extrabold">
            🌐 Deep Debate — real web research
          </p>
          <p className={cn("text-sm", value ? "text-white/80" : "text-ink/60")}>
            Fighters search the live web, quote and cite their sources.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label="Enable Deep Debate"
          onClick={() => {
            playSound(value ? "buttonClick" : "modeSelect");
            onChange(!value);
          }}
          className={cn(
            "relative h-9 w-16 shrink-0 rounded-full border-3 border-night transition",
            value ? "bg-arcade-green" : "bg-paper",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-night bg-white transition-all",
              value ? "left-[34px]" : "left-1",
            )}
          />
        </button>
      </div>

      {value ? (
        <div className="mt-3 space-y-2 rounded-card border-3 border-dashed border-ink/40 bg-paper p-3 text-sm">
          <p className="flex items-center gap-2 text-ink/75">✅ Live web search every turn</p>
          <p className="flex items-center gap-2 text-ink/75">✅ Quoted &amp; cited sources (in a collapsible list)</p>
          <p className="flex items-center gap-2 text-ink/75">⏱ Longer turns — about 30–90s each</p>
          <p className="flex items-center gap-2 text-ink/75">🔒 Length is set automatically (template)</p>
          <p className="flex items-center gap-2 font-semibold text-ink/60">
            💰 Search fees (if any) show up on each turn&apos;s cost badge.
          </p>
          {!fightersEligible ? (
            <p className="mt-1">
              <Badge color="orange" size="sm">
                ⚠️ Server needs a web-search key for these fighters
              </Badge>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
