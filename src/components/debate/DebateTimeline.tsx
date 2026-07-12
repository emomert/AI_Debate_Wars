"use client";

/**
 * DebateTimeline — the central feed of turns. Renders completed messages, the
 * currently-streaming turn (with cursor), and the thinking/judging indicators.
 * Auto-follows the newest text (owner feedback 7/12): the page scrolls down as
 * a turn streams in, but only while the reader is already at the bottom —
 * scrolling up to re-read pauses the follow until they come back down.
 */

import { useEffect, useRef } from "react";

import type {
  DebateMessage,
  DebateSession,
  DebateTurn,
  ModelColor,
  Speaker,
} from "@/lib/debate/debateTypes";
import type { RunnerPhase } from "@/lib/debate/useDebateRunner";
import { DebateMessageCard } from "@/components/debate/DebateMessageCard";
import { ThinkingBubble } from "@/components/debate/ThinkingBubble";
import { getModelById } from "@/lib/models/modelRegistry";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface Identity {
  title: string;
  subtitle?: string;
  avatar: string;
  /** Provider brand for the logo sticker (fighters only; the judge keeps ⚖️). */
  brand?: string;
  color: ModelColor;
}

function identityFor(speaker: Speaker, session: DebateSession, d: Dictionary): Identity {
  if (speaker === "modelA") {
    return {
      title: session.modelA.displayName,
      avatar: getModelById(session.modelA.modelId)?.avatar ?? "🤖",
      brand: getModelById(session.modelA.modelId)?.brand,
      color: session.modelA.color,
    };
  }
  if (speaker === "modelB") {
    return {
      title: session.modelB.displayName,
      avatar: getModelById(session.modelB.modelId)?.avatar ?? "🐉",
      brand: getModelById(session.modelB.modelId)?.brand,
      color: session.modelB.color,
    };
  }
  return {
    title: d.debate.timeline.judgeTitle,
    subtitle: d.debate.timeline.judgeSubtitle,
    avatar: "⚖️",
    color: "purple",
  };
}

interface DebateTimelineProps {
  session: DebateSession;
  messages: DebateMessage[];
  activeTurn: DebateTurn | null;
  /** The locked-in message being typed out — carries the citations so [n] chips are live mid-stream. */
  activeMessage: DebateMessage | null;
  streamingText: string;
  phase: RunnerPhase;
  /** Per-message voice control (play/stop button on completed cards). */
  voiceFor?: (m: DebateMessage) => { playing: boolean; onToggle: () => void };
}

export function DebateTimeline({
  session,
  messages,
  activeTurn,
  activeMessage,
  streamingText,
  phase,
  voiceFor,
}: DebateTimelineProps) {
  const d = useT();
  const empty = messages.length === 0 && !activeTurn && phase !== "judging";

  // Follow-the-text: stick to the bottom while the reader is within ~160px of
  // it (programmatic follows keep the gap at 0, so the stick self-sustains;
  // wheeling up breaks it, returning to the bottom re-arms it).
  const stickRef = useRef(true);
  const mountedRef = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      const gap =
        document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      stickRef.current = gap < 160;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true; // never yank on first paint (reopened matches)
      return;
    }
    if (!stickRef.current) return;
    // Instant, not smooth: this fires on every reveal tick, and stacked smooth
    // scrolls lag behind the text. Also covers the verdict/awaiting panels via
    // the `phase` dep — they mount right below the timeline.
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [streamingText, messages.length, phase]);

  return (
    <div className="space-y-3">
      {empty ? (
        <div className="rounded-card border-3 border-dashed border-ink/40 bg-surface/60 p-8 text-center">
          <p className="font-heading text-lg font-extrabold">{d.debate.timeline.warmingUpTitle}</p>
          <p className="mt-1 text-sm text-ink/60">
            {d.debate.timeline.warmingUpBody}
          </p>
        </div>
      ) : null}

      {messages.map((m) => {
        const id = identityFor(m.speaker, session, d);
        return (
          <DebateMessageCard
            key={m.id}
            speaker={m.speaker}
            title={id.title}
            subtitle={id.subtitle}
            avatar={id.avatar}
            brand={id.brand}
            color={id.color}
            roundLabel={m.roundLabel}
            stance={m.stance}
            content={m.content}
            cost={m.cost}
            usage={m.usage}
            latencyMs={m.latencyMs}
            citations={m.citations}
            voice={voiceFor?.(m)}
          />
        );
      })}

      {/* Active turn: thinking bubble, then the streaming card. */}
      {activeTurn ? (
        (() => {
          const id = identityFor(activeTurn.speaker, session, d);
          if (phase === "thinking") {
            return (
              <div
                className={
                  activeTurn.speaker === "modelB"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <ThinkingBubble name={id.title} color={id.color} deep={session.deepDebate} />
              </div>
            );
          }
          return (
            <DebateMessageCard
              speaker={activeTurn.speaker}
              title={id.title}
              subtitle={id.subtitle}
              avatar={id.avatar}
              brand={id.brand}
              color={id.color}
              roundLabel={activeTurn.roundLabel}
              stance={activeTurn.stance}
              content={streamingText}
              streaming
              citations={activeMessage?.citations}
            />
          );
        })()
      ) : null}

      {phase === "judging" ? (
        <div className="flex justify-center">
          <ThinkingBubble name={d.debate.timeline.theJudge} color="purple" kind="judge" />
        </div>
      ) : null}
    </div>
  );
}
