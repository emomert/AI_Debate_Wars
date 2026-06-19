/**
 * Reduce-motion preference (accessibility — WCAG 2.2.2 / 2.3.3).
 *
 * Two inputs decide "should we reduce motion":
 *  1. the OS `prefers-reduced-motion` flag (read via framer-motion in the hook), and
 *  2. this in-app toggle — persisted to localStorage — so a user can get calm,
 *     instant playback (incl. skipping the typewriter) without changing an OS
 *     setting, which the audit flagged as a hard gap on the live arena.
 *
 * When the in-app toggle is ON we add `.reduce-motion` to <html> so the CSS in
 * globals.css freezes every animation/transition too (the OS path is the @media
 * query). JS-driven animations read the combined value via useReduceMotion().
 */

const KEY = "ada:reduce-motion";

let pref = false;
let valueHydrated = false;
let listenerAttached = false;
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

function applyClass(): void {
  try {
    document.documentElement.classList.toggle("reduce-motion", pref);
  } catch {
    /* no document (SSR) */
  }
}

function hydrateValue(): void {
  if (valueHydrated || typeof window === "undefined") return;
  valueHydrated = true;
  pref = read();
  if (!listenerAttached) {
    listenerAttached = true;
    // Cross-tab sync: another tab toggling the preference updates this one.
    window.addEventListener("storage", (e) => {
      if (e.key !== KEY) return;
      pref = read();
      applyClass();
      listeners.forEach((l) => l());
    });
  }
}

/** Apply the persisted reduce-motion class on first client load (mount effect). */
export function initReduceMotion(): void {
  hydrateValue();
  applyClass();
}

export function getReduceMotionPref(): boolean {
  hydrateValue();
  return pref;
}

export function setReduceMotionPref(on: boolean): void {
  hydrateValue();
  pref = on;
  try {
    window.localStorage.setItem(KEY, on ? "true" : "false");
  } catch {
    /* ignore */
  }
  applyClass();
  listeners.forEach((l) => l());
}

export function toggleReduceMotionPref(): boolean {
  setReduceMotionPref(!getReduceMotionPref());
  return pref;
}

export function subscribeReduceMotion(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
