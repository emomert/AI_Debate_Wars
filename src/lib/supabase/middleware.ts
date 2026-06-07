/**
 * Session refresh for Next.js middleware (docs/19). Keeps the Supabase auth
 * cookie fresh on page navigations. No-op (and never throws) when Supabase
 * isn't configured or is briefly unreachable, so it can't break navigation.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response; // auth disabled until configured

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    // Touch the session so an expired access token is refreshed into the cookie.
    await supabase.auth.getUser();
  } catch {
    // A Supabase hiccup must never block the page — just serve it signed-out.
  }
  return response;
}
