"use client";

/**
 * RoundTimeline — visualizes the deterministic turn plan of a session as a
 * horizontal match timeline: one block per round with its label and the A/B
 * turn pills, plus the verdict block when the judge is enabled. Clicking a
 * pill selects that turn for the prompt preview.
 */

import { useT } from "@/lib/i18n/LocaleProvider";
import type { DebateTurn } from "@/lib/debate/debateTypes";
import { cn } from "@/lib/utils/cn";

interface RoundTimelineProps {
  /** Fighter turns only, in plan order. */
  turns: DebateTurn[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  judgeEnabled: boolean;
}

export function RoundTimeline({ turns, selectedIdx, onSelect, judgeEnabled }: RoundTimelineProps) {
  const d = useT();

  const rounds = new Map<number, { label: string; entries: { idx: number; turn: DebateTurn }[] }>();
  turns.forEach((turn, idx) => {
    const round = rounds.get(turn.roundNumber);
    if (round) round.entries.push({ idx, turn });
    else rounds.set(turn.roundNumber, { label: turn.roundLabel, entries: [{ idx, turn }] });
  });

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {Array.from(rounds, ([roundNumber, round]) => (
        <div
          key={roundNumber}
          className="flex min-w-[120px] shrink-0 flex-col rounded-card border-3 border-ink bg-surface p-2"
        >
          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/45">
            {d.report.playground.timelineRound(roundNumber)}
          </p>
          <p className="mb-1.5 truncate text-[11px] font-extrabold" title={round.label}>
            {round.label}
          </p>
          <div className="mt-auto flex gap-1.5">
            {round.entries.map(({ idx, turn }) => (
              <button
                key={turn.id}
                type="button"
                onClick={() => onSelect(idx)}
                aria-pressed={idx === selectedIdx}
                title={turn.task}
                className={cn(
                  "flex-1 rounded-btn border-3 border-ink px-2 py-1 text-xs font-extrabold transition",
                  turn.speaker === "modelA" ? "text-white" : "text-white",
                  idx === selectedIdx
                    ? cn(
                        "-translate-y-0.5 shadow-hard-sm",
                        turn.speaker === "modelA" ? "bg-arcade-blue" : "bg-arcade-red",
                      )
                    : "bg-night/70 hover:-translate-y-0.5",
                )}
              >
                {turn.speaker === "modelA" ? "A" : "B"}
              </button>
            ))}
          </div>
        </div>
      ))}
      {judgeEnabled ? (
        <div className="flex min-w-[88px] shrink-0 flex-col items-center justify-center rounded-card border-3 border-dashed border-ink/50 bg-arcade-purple/10 p-2 text-center">
          <p className="text-xs font-extrabold">{d.report.playground.timelineJudge}</p>
        </div>
      ) : null}
    </div>
  );
}
