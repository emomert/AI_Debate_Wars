"use client";

/**
 * DialogueBox — the bottom-of-stage line box. Shows only the CURRENT turn's text
 * (typed out by the runner) plus the speaker nameplate and the move chip.
 */

import type { BlitzMove } from "@/lib/debate/debateTypes";

export function DialogueBox({
  speakerName,
  line,
  move,
}: {
  speakerName: string;
  line: string;
  move: BlitzMove | null;
}) {
  return (
    <div className="w-full rounded-panel border-4 border-ink bg-paper p-4 shadow-hard sm:p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-display text-ink">{speakerName}</span>
        {move ? (
          <span className="rounded-badge border-2 border-ink bg-arcade-yellow px-2 py-0.5 text-xs font-bold text-night">
            {move}
          </span>
        ) : null}
      </div>
      <p className="min-h-[3.5rem] text-base leading-snug text-ink sm:text-lg">{line}</p>
    </div>
  );
}
