"use client";

/**
 * Debate — the live arena route. Thin wrapper: GameShell + the self-contained
 * DebateArena, which owns the Phase 1 playback runner and all controls.
 */

import { GameShell } from "@/components/game/GameShell";
import { DebateArena } from "@/components/debate/DebateArena";

export default function DebatePage() {
  // hideFooter: the sticky bottom controls own the page end here.
  // flushTop: the sticky DebateHUD bar docks directly under the header.
  // flex flex-col: lets the arena column stretch to the viewport bottom, so the
  // sticky DebateControls bar rests at the page end even with little content.
  return (
    <GameShell wide hideFooter flushTop className="flex flex-col">
      <DebateArena />
    </GameShell>
  );
}
