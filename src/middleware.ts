import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  detectLocaleFromAcceptLanguage,
} from "@/lib/i18n/config";

/**
 * Refreshes the Supabase auth session cookie on page navigations only (API
 * routes are excluded so debate turns/verdicts never pay for a Supabase
 * round-trip, and static assets are excluded too), AND seeds the locale cookie
 * from the browser's Accept-Language on the first visit so Turkish browsers open
 * in Turkish. The header toggle overwrites it thereafter.
 */
export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  if (!request.cookies.get(LOCALE_COOKIE)) {
    const locale = detectLocaleFromAcceptLanguage(
      request.headers.get("accept-language"),
    );
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|woff2?)$).*)",
  ],
};
