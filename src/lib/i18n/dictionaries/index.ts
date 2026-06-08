/** Locale → dictionary registry. Both dictionaries are static (bundled). */
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { en, type Dictionary } from "./en";
import { tr } from "./tr";

export type { Dictionary };

export const dictionaries: Record<Locale, Dictionary> = { en, tr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
