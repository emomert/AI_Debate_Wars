"use client";

/**
 * MusicToggle — turns the calm generative background music on/off. Off by
 * default (no autoplay); preference persisted via the sound manager.
 */

import { IconButton } from "@/components/game/IconButton";
import { useArena } from "@/lib/state/ArenaContext";

export function MusicToggle() {
  const { musicEnabled, toggleMusic } = useArena();
  return (
    <IconButton
      label={musicEnabled ? "Turn music off" : "Turn music on"}
      onClick={toggleMusic}
      color={musicEnabled ? "purple" : "white"}
      active={musicEnabled}
      silent
    >
      <span aria-hidden>{musicEnabled ? "🎵" : "🎶"}</span>
    </IconButton>
  );
}
