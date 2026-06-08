"use client";

/**
 * SoundToggle — flips the global sound preference (muted by default, persisted
 * to localStorage via the sound manager). Always visible per docs/12.
 */

import { IconButton } from "@/components/game/IconButton";
import { useArena } from "@/lib/state/ArenaContext";
import { useT } from "@/lib/i18n/LocaleProvider";

export function SoundToggle() {
  const { soundEnabled, toggleSound } = useArena();
  const d = useT();
  return (
    <IconButton
      label={soundEnabled ? d.shell.controls.soundMute : d.shell.controls.soundEnable}
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
