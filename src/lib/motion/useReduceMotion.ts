"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";

import {
  getReduceMotionPref,
  subscribeReduceMotion,
} from "@/lib/motion/reduceMotion";

/** The in-app reduce-motion toggle value alone (ignores the OS flag). */
export function useReduceMotionPref(): boolean {
  return useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotionPref,
    () => false, // SSR: never reduced until the client hydrates the preference
  );
}

/**
 * True when motion should be reduced: the OS `prefers-reduced-motion` flag OR the
 * in-app toggle. Use this to gate JS-driven animation (framer-motion values, the
 * typewriter loop). Pure CSS animations are handled by globals.css.
 */
export function useReduceMotion(): boolean {
  const os = useReducedMotion();
  const pref = useReduceMotionPref();
  return Boolean(os) || pref;
}
