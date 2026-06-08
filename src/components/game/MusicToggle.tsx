"use client";

/**
 * MusicToggle — turns the background music on/off. ON by default (it actually
 * starts on the first user interaction, per browser autoplay policy) and only
 * stops when the user presses this button; preference persisted via the sound
 * manager.
 */

import { IconButton } from "@/components/game/IconButton";
import { useArena } from "@/lib/state/ArenaContext";
import { useT } from "@/lib/i18n/LocaleProvider";

export function MusicToggle() {
  const { musicEnabled, toggleMusic } = useArena();
  const d = useT();
  return (
    <IconButton
      label={musicEnabled ? d.shell.controls.musicOff : d.shell.controls.musicOn}
      onClick={toggleMusic}
      color={musicEnabled ? "purple" : "white"}
      active={musicEnabled}
      silent
      flat
    >
      <span aria-hidden>{musicEnabled ? "🎵" : "🎶"}</span>
    </IconButton>
  );
}
