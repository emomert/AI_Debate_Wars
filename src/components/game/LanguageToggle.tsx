"use client";

/**
 * LanguageToggle — flips the UI (and new debates) between English and Turkish.
 * Shows the active locale code with a globe; the accessible label names the
 * language it will switch TO. Persists via the locale cookie (see LocaleProvider)
 * and refreshes Server Components so the whole page re-renders in the new tongue.
 */

import { IconButton } from "@/components/game/IconButton";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const d = useT();
  const target = locale === "tr" ? "en" : "tr";
  const label = target === "tr" ? d.common.switchToTurkish : d.common.switchToEnglish;

  return (
    <IconButton
      label={label}
      onClick={() => setLocale(target)}
      color="white"
      flat
      className="w-auto px-2.5"
    >
      <span className="flex items-center gap-1 text-sm font-extrabold">
        <span aria-hidden className="text-[15px]">
          🌐
        </span>
        {locale === "tr" ? "TR" : "EN"}
      </span>
    </IconButton>
  );
}
