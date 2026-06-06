"use client";

/**
 * Debate — the live arena route. Thin wrapper: GameShell + the self-contained
 * DebateArena, which owns the Phase 1 playback runner and all controls.
 */

import { GameShell } from "@/components/game/GameShell";
import { DebateArena } from "@/components/debate/DebateArena";

export default function DebatePage() {
  // hideFooter: the sticky bottom controls own the page end here.
  return (
    <GameShell wide hideFooter>
      <DebateArena />
    </GameShell>
  );
}
