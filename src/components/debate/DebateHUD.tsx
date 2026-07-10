"use client";

/**
 * DebateHUD — the sticky top status bar for the arena. Decluttered (July 2026):
 * round pill, the match's tone + length chips, and the pace / skip controls.
 * The old mode/phase/speaker chips are gone, and the running-cost pill only
 * renders when the cost UI is enabled (COST_UI_ENABLED).
 */

import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils/cn";

import type { DebatePace, SessionCostSummary } from "@/lib/debate/debateTypes";
import type { RunnerPhase } from "@/lib/debate/useDebateRunner";
import { RoundCounter } from "@/components/debate/RoundCounter";
import { Badge } from "@/components/game/Badge";
import { formatCost, formatTokens } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LocaleProvider";
import { COST_UI_ENABLED } from "@/lib/cost/uiConfig";
import { VOICE_ENABLED } from "@/lib/tts/config";

interface DebateHUDProps {
  currentRound: number;
  totalRounds: number;
  costSummary: SessionCostSummary;
  phase: RunnerPhase;
  messageCount: number;
  /** Pre-formatted "Tone: …" chip text (session tone, custom-aware). */
  toneText: string;
  /** Pre-formatted length chip text ("short" / "🌐 Deep Debate" / …). */
  formatText: string;
  pace: DebatePace;
  onTogglePace: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  /** Running server-TTS spend this session (0 = free tier / nothing spoken). */
  voiceCostUsd: number;
  /** Skip = finish the turn's text instantly + stop voice (shown while typing). */
  canSkip: boolean;
  onSkip: () => void;
}

function DebateHUDComponent({
  currentRound,
  totalRounds,
  costSummary,
  phase,
  messageCount,
  toneText,
  formatText,
  pace,
  onTogglePace,
  voiceEnabled,
  onToggleVoice,
  voiceCostUsd,
  canSkip,
  onSkip,
}: DebateHUDProps) {
  const d = useT();
  const live = phase !== "done" && phase !== "stopped" && phase !== "error";

  // Scroll-aware fill: at the top of the page the bar is TRANSPARENT so the
  // dotted background shows through; once the debate content starts sliding
  // underneath it (any scroll), it regains a solid blurred fill so text never
  // shows through the gaps between the chips.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll(); // resume mid-page (e.g. after navigation) starts solid
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // top offset = compact header height (52px). Kept tight: this bar plus the
  // header are sticky and were eating too much reading space.
  return (
    <div
      className={cn(
        "sticky top-[52px] z-20 -mx-4 border-b-4 border-ink px-4 py-1.5 transition-colors duration-200",
        scrolled ? "bg-paper/90 backdrop-blur" : "bg-transparent",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <RoundCounter roundNumber={currentRound} totalRounds={totalRounds} />
          <Badge color="white" size="sm" className="max-w-[12rem] truncate">
            {toneText}
          </Badge>
          <Badge color="white" size="sm">
            {formatText}
          </Badge>
          {live ? (
            <button
              type="button"
              onClick={onTogglePace}
              aria-label={d.debate.hud.paceLabel(pace)}
              className="inline-flex items-center gap-1 rounded-badge border-3 border-ink bg-surface px-2 py-1 text-[11px] font-extrabold uppercase transition hover:bg-arcade-yellow hover:text-night focus-visible:outline-3 focus-visible:outline-offset-2"
            >
              {pace === "auto" ? d.debate.hud.paceSwitchNormal : d.debate.hud.paceSwitchFast}
            </button>
          ) : null}
          {VOICE_ENABLED ? (
            <button
              type="button"
              onClick={onToggleVoice}
              aria-pressed={voiceEnabled}
              aria-label={d.debate.voice.toggleLabel(voiceEnabled)}
              className={cn(
                "inline-flex items-center gap-1 rounded-badge border-3 border-ink px-2 py-1 text-[11px] font-extrabold uppercase transition focus-visible:outline-3 focus-visible:outline-offset-2",
                voiceEnabled
                  ? "bg-arcade-green text-night"
                  : "bg-surface hover:bg-arcade-yellow hover:text-night",
              )}
            >
              {voiceEnabled ? d.debate.voice.hudOn : d.debate.voice.hudOff}
            </button>
          ) : null}
          {canSkip ? (
            <button
              type="button"
              onClick={onSkip}
              aria-label={d.debate.voice.skipLabel}
              className="inline-flex items-center gap-1 rounded-badge border-3 border-ink bg-surface px-2 py-1 text-[11px] font-extrabold uppercase transition hover:bg-arcade-yellow hover:text-night focus-visible:outline-3 focus-visible:outline-offset-2"
            >
              {d.debate.voice.skip}
            </button>
          ) : null}
        </div>

        {COST_UI_ENABLED ? (
          <motion.div
            key={costSummary.totalCost.toFixed(4)}
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-1.5 rounded-btn border-3 border-ink bg-night px-2 py-0.5 font-mono text-[11px] font-bold text-arcade-green"
            aria-label={d.debate.hud.totalCost}
          >
            <span aria-hidden>💰</span>
            <span>{formatCost(costSummary.totalCost)}</span>
            <span className="text-white/50">·</span>
            <span className="text-white/70">{formatTokens(costSummary.totalTokens)}</span>
            <span className="text-white/50">·</span>
            <span className="text-white/70">{messageCount} {d.debate.hud.msgSuffix}</span>
            {VOICE_ENABLED && voiceCostUsd > 0 ? (
              <>
                <span className="text-white/50">·</span>
                <span aria-label={d.debate.voice.costLabel} className="text-white/70">
                  🔊 {formatCost(voiceCostUsd)}
                </span>
              </>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

// Memoized: the HUD's props are stable during a turn's typewriter, so it no
// longer re-renders ~60×/sec while text is streaming.
export const DebateHUD = memo(DebateHUDComponent);
