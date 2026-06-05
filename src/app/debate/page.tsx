"use client";

/**
 * Debate — the live arena route. Thin wrapper: GameShell + the self-contained
 * DebateArena, which owns the Phase 1 playback runner and all controls.
 */

import { GameShell } from "@/components/game/GameShell";
import { DebateArena } from "@/components/debate/DebateArena";

export default function DebatePage() {
  return (
    <GameShell wide>
      <DebateArena />
    </GameShell>
  );
}
