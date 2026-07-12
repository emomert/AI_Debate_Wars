"use client";

/**
 * AudioToggle — ONE switch for the whole soundscape (owner 7/12: the separate
 * music + SFX buttons were confusing). If anything is audible it silences
 * everything; otherwise it turns both SFX and music on together (the click is
 * the user gesture browsers require for music autoplay).
 */

import { IconButton } from "@/components/game/IconButton";
import { useArena } from "@/lib/state/ArenaContext";
import { useT } from "@/lib/i18n/LocaleProvider";

export function AudioToggle() {
  const { soundEnabled, musicEnabled, toggleAudio } = useArena();
  const d = useT();
  const on = soundEnabled || musicEnabled;
  return (
    <IconButton
      label={on ? d.shell.controls.audioMute : d.shell.controls.audioEnable}
      onClick={toggleAudio}
      color={on ? "yellow" : "white"}
      active={on}
      silent
      flat
    >
      <span aria-hidden>{on ? "🔊" : "🔇"}</span>
    </IconButton>
  );
}
