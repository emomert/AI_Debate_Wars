import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Refreshes the Supabase auth session cookie on page navigations only. API
 * routes are excluded so debate turns/verdicts never pay for a Supabase
 * round-trip (and static assets are excluded too).
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|woff2?)$).*)",
  ],
};
