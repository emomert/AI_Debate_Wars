/**
 * i18n core config (pure, isomorphic — safe in server, client and edge code).
 *
 * The app ships English + Turkish. The active locale lives in a cookie
 * (`debator_locale`) so server components can read it; middleware seeds it from
 * the browser's Accept-Language on the first visit (Turkish browsers → tr), and
 * the header toggle overwrites it. Nothing here imports React or Next.
 */

export const LOCALES = ["en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Master switch for the multi-language experience. Turkish is HIDDEN for now:
 * the language toggle is not rendered and every locale resolver pins to English,
 * so the (still-bundled) Turkish dictionaries lie dormant. Flip this to `true`
 * to bring the toggle + Turkish back with zero other code changes.
 */
export const MULTILOCALE_ENABLED = false;
export const LOCALE_COOKIE = "debator_locale";
/** One year — a language choice should be sticky. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Pick a locale from an `Accept-Language` header. Deliberately simple: we only
 * support two locales, so a Turkish primary tag (`tr`, `tr-TR`) wins, otherwise
 * English. Used by middleware to seed the cookie on the first request.
 */
export function detectLocaleFromAcceptLanguage(
  header: string | null | undefined,
): Locale {
  if (!MULTILOCALE_ENABLED) return DEFAULT_LOCALE; // Turkish hidden for now
  if (!header) return DEFAULT_LOCALE;
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("tr") ? "tr" : DEFAULT_LOCALE;
}

/**
 * Read the persisted locale from `document.cookie` on the client. SSR-safe
 * (returns the default when there's no `document`). Used by client-only code
 * that can't reach the React context — e.g. stamping a new debate session with
 * the language it should run in.
 */
export function readClientLocale(): Locale {
  if (!MULTILOCALE_ENABLED) return DEFAULT_LOCALE; // Turkish hidden for now
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(/(?:^|;\s*)debator_locale=([^;]+)/);
  const value = match?.[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
