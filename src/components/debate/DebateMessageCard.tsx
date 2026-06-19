"use client";

/**
 * DebateMessageCard — one AI turn (docs/02). Model A leans left with blue
 * accents, Model B leans right with red accents, the judge is centred with
 * purple accents. While streaming it shows a blinking cursor and hides the cost
 * badge until usage is finalised.
 */

import { memo } from "react";
import { motion } from "framer-motion";

import type {
  Citation,
  CostBreakdown,
  ModelColor,
  Speaker,
  Stance,
  TokenUsage,
} from "@/lib/debate/debateTypes";
import { Badge } from "@/components/game/Badge";
import { CostBadge } from "@/components/debate/CostBadge";
import { MarkdownText } from "@/components/debate/MarkdownText";
import { SourcesList } from "@/components/debate/SourcesList";
import { useRotatingLine } from "@/components/debate/waitingMessages";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";
import { VOICE_ENABLED } from "@/lib/tts/config";

/**
 * Rotating playful caption shown WHILE a fighter's answer types out, in any
 * mode. Its own component so the timer only runs on the single streaming card
 * (mounted only while streaming), not on every completed message card.
 */
function WritingCaption({ name }: { name: string }) {
  const d = useT();
  const line = useRotatingLine(d.debate.writingLines, name);
  return (
    <p className="truncate text-[11px] italic text-ink/55">{d.debate.message.writing(line)}</p>
  );
}

interface DebateMessageCardProps {
  speaker: Speaker;
  title: string;
  subtitle?: string;
  avatar: string;
  color: ModelColor;
  roundLabel?: string;
  stance?: Stance;
  content: string;
  streaming?: boolean;
  cost?: CostBreakdown;
  usage?: TokenUsage;
  latencyMs?: number;
  citations?: Citation[];
  /** Voice playback control for this message (debate arena only). */
  voice?: { playing: boolean; onToggle: () => void };
}

const ACCENT_BAR: Record<ModelColor, string> = {
  blue: "bg-arcade-blue",
  red: "bg-arcade-red",
  yellow: "bg-arcade-orange",
  purple: "bg-arcade-purple",
};

function DebateMessageCardComponent({
  speaker,
  title,
  subtitle,
  avatar,
  color,
  roundLabel,
  stance,
  content,
  streaming,
  cost,
  usage,
  latencyMs,
  citations,
  voice,
}: DebateMessageCardProps) {
  const d = useT();
  const reduce = useReduceMotion();
  const isJudge = speaker === "judge";
  const isModelB = speaker === "modelB";
  // Mirror-symmetric lean at EVERY breakpoint (incl. phones): Model A leans left,
  // Model B leans right, the judge is centred. The small fixed gap on the flush
  // side (mr-1 / ml-1) keeps both sides symmetric AND gives the bottom-right hard
  // shadow room so the right edge never reads tighter than the left on mobile.
  const align = isJudge
    ? "mx-auto"
    : isModelB
      ? "ml-auto mr-1"
      : "mr-auto ml-1";
  // Model B (red) leans right, so its accent bar sits on the RIGHT edge to match
  // its side of the arena; Model A and the judge keep the bar on the left.
  const barSide = isModelB ? "right-0" : "left-0";

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
      className={cn(
        // Capped under full width on phones too (was w-full), so the lean above
        // actually has room to push A left / B right instead of filling the row.
        "relative w-full max-w-[94%] overflow-hidden rounded-card border-4 border-ink bg-card shadow-hard-sm sm:max-w-[88%]",
        align,
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 w-1.5", barSide, ACCENT_BAR[color])} />

      <div className={cn("p-3 sm:p-4", isModelB ? "pr-4 sm:pr-5" : "pl-4 sm:pl-5")}>
        <header className="mb-2 flex flex-wrap items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-btn border-3 border-ink bg-paper text-lg">
            {avatar}
          </span>
          <div className="min-w-0">
            {/* Wraps on phones so long model names stay fully readable;
                truncates from sm+ where the header row has room. */}
            <p className="break-words font-heading text-sm font-extrabold leading-tight sm:truncate">
              {title}
            </p>
            {streaming && !isJudge ? (
              <WritingCaption name={title} />
            ) : subtitle ? (
              <p className="truncate text-[11px] text-ink/50">{subtitle}</p>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {roundLabel ? <Badge color="white" size="sm">{roundLabel}</Badge> : null}
            {stance ? (
              <Badge color={stance === "pro" ? "blue" : "red"} size="sm">
                {stance === "pro" ? d.debate.message.pro : d.debate.message.against}
              </Badge>
            ) : null}
            {isJudge ? <Badge color="purple" size="sm">{d.debate.message.judge}</Badge> : null}
          </div>
        </header>

        <div className="relative">
          <MarkdownText
            content={content}
            streaming={streaming}
            citations={citations}
            cursor={
              streaming ? (
                <span
                  aria-hidden
                  className={cn(
                    "ml-1 inline-block h-[1.15em] w-[0.6em] translate-y-[2px] animate-caret-blink rounded-[3px] border-2 border-ink align-text-bottom shadow-[1.5px_1.5px_0_var(--shadow-ink)]",
                    ACCENT_BAR[color],
                  )}
                />
              ) : undefined
            }
          />
        </div>

        {!streaming ? (
          <footer className="mt-3 flex flex-wrap items-start gap-2">
            <CostBadge cost={cost} usage={usage} latencyMs={latencyMs} />
            {citations && citations.length > 0 ? (
              <SourcesList citations={citations} />
            ) : null}
            {voice && VOICE_ENABLED ? (
              <button
                type="button"
                onClick={voice.onToggle}
                aria-pressed={voice.playing}
                className={cn(
                  "inline-flex items-center gap-1 rounded-badge border-3 border-ink px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide transition focus-visible:outline-3 focus-visible:outline-offset-2",
                  voice.playing
                    ? "bg-arcade-green text-night"
                    : "bg-surface hover:bg-arcade-yellow hover:text-night",
                )}
              >
                {voice.playing ? d.debate.voice.stop : d.debate.voice.play}
              </button>
            ) : null}
          </footer>
        ) : null}
      </div>
    </motion.article>
  );
}

// Memoized so completed message cards don't re-render on every typewriter frame
// of the active turn — only the streaming card (whose `content` changes) updates.
export const DebateMessageCard = memo(DebateMessageCardComponent);
