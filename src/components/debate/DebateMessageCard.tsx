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
import { cn } from "@/lib/utils/cn";

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
}: DebateMessageCardProps) {
  const isJudge = speaker === "judge";
  const align =
    speaker === "modelB" ? "sm:ml-auto sm:mr-0" : isJudge ? "sm:mx-auto" : "sm:mr-auto sm:ml-0";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "relative w-full overflow-hidden rounded-card border-4 border-ink bg-card shadow-hard-sm sm:max-w-[88%]",
        align,
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", ACCENT_BAR[color])} />

      <div className="p-3 pl-4 sm:p-4 sm:pl-5">
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
            {subtitle ? (
              <p className="truncate text-[11px] text-ink/50">{subtitle}</p>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {roundLabel ? <Badge color="white" size="sm">{roundLabel}</Badge> : null}
            {stance ? (
              <Badge color={stance === "pro" ? "blue" : "red"} size="sm">
                {stance === "pro" ? "PRO" : "AGAINST"}
              </Badge>
            ) : null}
            {isJudge ? <Badge color="purple" size="sm">⚖️ Judge</Badge> : null}
          </div>
        </header>

        <div className="relative">
          <MarkdownText
            content={content}
            streaming={streaming}
            citationCount={citations?.length ?? 0}
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
          </footer>
        ) : null}
      </div>
    </motion.article>
  );
}

// Memoized so completed message cards don't re-render on every typewriter frame
// of the active turn — only the streaming card (whose `content` changes) updates.
export const DebateMessageCard = memo(DebateMessageCardComponent);
