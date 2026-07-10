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
import { useT } from "@/lib/i18n/LocaleProvider";

interface DeepDebateToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  /** True when both fighters can deep-search (natively or via the app's search engine). */
  fightersEligible: boolean;
  /**
   * Slim in-panel variant: lives INSIDE the Topic section instead of owning a
   * whole setup panel — smaller card, smaller switch, same behavior.
   */
  compact?: boolean;
}

export function DeepDebateToggle({
  value,
  onChange,
  fightersEligible,
  compact = false,
}: DeepDebateToggleProps) {
  const d = useT();
  return (
    <div>
      <div
        className={cn(
          "relative flex items-center justify-between gap-3 rounded-card border-ink shadow-hard-sm transition-colors",
          compact ? "border-3 p-2.5" : "border-4 p-3",
          value ? "bg-arcade-purple text-white" : "bg-surface",
        )}
      >
        <div className="min-w-0">
          <p className={cn("font-heading font-extrabold", compact ? "text-sm" : "text-base")}>
            {d.setup.deep.title}
          </p>
          <p
            className={cn(
              compact ? "text-xs" : "text-sm",
              value ? "text-white/80" : "text-ink/60",
            )}
          >
            {d.setup.deep.subtitle}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={d.setup.deep.enable}
          onClick={() => {
            playSound(value ? "buttonClick" : "modeSelect");
            onChange(!value);
          }}
          className={cn(
            "relative shrink-0 rounded-full border-3 border-night transition",
            compact ? "h-7 w-[52px]" : "h-9 w-16",
            value ? "bg-arcade-green" : "bg-paper",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-night bg-white transition-all",
              compact ? "h-4 w-4" : "h-6 w-6",
              value ? (compact ? "left-[26px]" : "left-[34px]") : "left-1",
            )}
          />
        </button>
      </div>

      {value ? (
        <div className="mt-3 space-y-2 rounded-card border-3 border-dashed border-ink/40 bg-paper p-3 text-sm">
          <p className="flex items-center gap-2 text-ink/75">{d.setup.deep.benefitSearch}</p>
          <p className="flex items-center gap-2 text-ink/75">{d.setup.deep.benefitCited}</p>
          <p className="flex items-center gap-2 text-ink/75">{d.setup.deep.benefitSlower}</p>
          <p className="flex items-center gap-2 text-ink/75">{d.setup.deep.benefitFixed}</p>
          <p className="flex items-center gap-2 font-semibold text-ink/60">
            {d.setup.deep.benefitFees}
          </p>
          {!fightersEligible ? (
            <p className="mt-1">
              <Badge color="orange" size="sm">
                {d.setup.deep.needsKey}
              </Badge>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
