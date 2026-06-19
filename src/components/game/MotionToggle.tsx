"use client";

/**
 * MotionToggle — the in-app "Reduce motion / instant text" switch (a11y). When
 * ON it freezes the arcade animations (caret, bounce, pulse, hover) and reveals
 * each debate turn instantly instead of typing it out, independent of the OS
 * `prefers-reduced-motion` flag (which is always honored regardless).
 */

import { IconButton } from "@/components/game/IconButton";
import { useReduceMotionPref } from "@/lib/motion/useReduceMotion";
import { toggleReduceMotionPref } from "@/lib/motion/reduceMotion";
import { useT } from "@/lib/i18n/LocaleProvider";

export function MotionToggle() {
  const reduce = useReduceMotionPref();
  const d = useT();
  return (
    <IconButton
      label={reduce ? d.shell.controls.motionAllow : d.shell.controls.motionReduce}
      onClick={() => toggleReduceMotionPref()}
      color={reduce ? "purple" : "white"}
      active={reduce}
      silent
      flat
    >
      <span aria-hidden>{reduce ? "🐢" : "🎬"}</span>
    </IconButton>
  );
}
