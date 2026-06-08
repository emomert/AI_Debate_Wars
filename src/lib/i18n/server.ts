/**
 * Server-side locale resolution for Server Components (layout, profile, report,
 * share page, metadata). Reads the persisted cookie; on the very first request —
 * before middleware has seeded it — falls back to the Accept-Language header so
 * the first paint is already in the right language.
 */
import "server-only";

import { cookies, headers } from "next/headers";

import {
  LOCALE_COOKIE,
  detectLocaleFromAcceptLanguage,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  return detectLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}

export async function getServerDictionary(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}
