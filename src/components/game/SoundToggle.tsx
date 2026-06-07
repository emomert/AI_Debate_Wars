"use client";

/**
 * SoundToggle — flips the global sound preference (muted by default, persisted
 * to localStorage via the sound manager). Always visible per docs/12.
 */

import { IconButton } from "@/components/game/IconButton";
import { useArena } from "@/lib/state/ArenaContext";

export function SoundToggle() {
  const { soundEnabled, toggleSound } = useArena();
  return (
    <IconButton
      label={soundEnabled ? "Mute sound" : "Enable sound"}
      onClick={toggleSound}
      color={soundEnabled ? "yellow" : "white"}
      active={soundEnabled}
      silent
      flat
    >
      <span aria-hidden>{soundEnabled ? "🔊" : "🔇"}</span>
    </IconButton>
  );
}
