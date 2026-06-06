"use client";

/**
 * DebateTimeline — the central feed of turns. Renders completed messages, the
 * currently-streaming turn (with cursor), and the thinking/judging indicators.
 */

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

interface Identity {
  title: string;
  subtitle?: string;
  avatar: string;
  color: ModelColor;
}

function identityFor(speaker: Speaker, session: DebateSession): Identity {
  if (speaker === "modelA") {
    return {
      title: session.modelA.displayName,
      subtitle: session.modelA.nickname,
      avatar: getModelById(session.modelA.modelId)?.avatar ?? "🤖",
      color: session.modelA.color,
    };
  }
  if (speaker === "modelB") {
    return {
      title: session.modelB.displayName,
      subtitle: session.modelB.nickname,
      avatar: getModelById(session.modelB.modelId)?.avatar ?? "🐉",
      color: session.modelB.color,
    };
  }
  return { title: "Judge", subtitle: "Neutral arbiter", avatar: "⚖️", color: "purple" };
}

interface DebateTimelineProps {
  session: DebateSession;
  messages: DebateMessage[];
  activeTurn: DebateTurn | null;
  streamingText: string;
  phase: RunnerPhase;
}

export function DebateTimeline({
  session,
  messages,
  activeTurn,
  streamingText,
  phase,
}: DebateTimelineProps) {
  const empty = messages.length === 0 && !activeTurn && phase !== "judging";

  return (
    <div className="space-y-3">
      {empty ? (
        <div className="rounded-card border-3 border-dashed border-ink/40 bg-surface/60 p-8 text-center">
          <p className="font-heading text-lg font-extrabold">The arena is warming up…</p>
          <p className="mt-1 text-sm text-ink/60">
            The first fighter is about to step up.
          </p>
        </div>
      ) : null}

      {messages.map((m) => {
        const id = identityFor(m.speaker, session);
        return (
          <DebateMessageCard
            key={m.id}
            speaker={m.speaker}
            title={id.title}
            subtitle={id.subtitle}
            avatar={id.avatar}
            color={id.color}
            roundLabel={m.roundLabel}
            stance={m.stance}
            content={m.content}
            cost={m.cost}
            usage={m.usage}
            latencyMs={m.latencyMs}
          />
        );
      })}

      {/* Active turn: thinking bubble, then the streaming card. */}
      {activeTurn ? (
        (() => {
          const id = identityFor(activeTurn.speaker, session);
          if (phase === "thinking") {
            return (
              <div
                className={
                  activeTurn.speaker === "modelB"
                    ? "flex justify-start sm:justify-end"
                    : "flex justify-start"
                }
              >
                <ThinkingBubble name={id.title} color={id.color} />
              </div>
            );
          }
          return (
            <DebateMessageCard
              speaker={activeTurn.speaker}
              title={id.title}
              subtitle={id.subtitle}
              avatar={id.avatar}
              color={id.color}
              roundLabel={activeTurn.roundLabel}
              stance={activeTurn.stance}
              content={streamingText}
              streaming
            />
          );
        })()
      ) : null}

      {phase === "judging" ? (
        <div className="flex justify-center">
          <ThinkingBubble name="The Judge" color="purple" />
        </div>
      ) : null}
    </div>
  );
}
