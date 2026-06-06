"use client";

/**
 * ThemeToggle — light/dark switch in the top HUD. Class-based (html.dark),
 * persisted to localStorage; layout.tsx applies the stored choice before first
 * paint so there's no flash. Default is light.
 */

import { useEffect, useState } from "react";

import { IconButton } from "@/components/game/IconButton";

const THEME_KEY = "debator-theme";
// Keep the mobile browser chrome (address bar) tinted with the active theme.
const THEME_COLOR = { light: "#F7F7F2", dark: "#15161A" } as const;

function syncThemeColorMeta(dark: boolean) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

export function ThemeToggle() {
  // SSR renders the light state; the mount effect syncs with whatever the
  // pre-paint script applied, so there's no hydration mismatch.
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
    syncThemeColorMeta(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    syncThemeColorMeta(next);
    try {
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  return (
    <IconButton
      label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      active={dark}
      color={dark ? "yellow" : "white"}
    >
      <span aria-hidden>{dark ? "☀️" : "🌙"}</span>
    </IconButton>
  );
}
