/**
 * Auth callback (docs/19). Handles BOTH sign-in flows:
 *   - OAuth (Google) and PKCE magic links return ?code= → exchangeCodeForSession
 *   - token-hash style email links return ?token_hash=&type= → verifyOtp
 * On success redirects to a sanitized same-origin `next` path (default "/").
 */

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Only allow a same-origin absolute path → blocks open-redirect abuse. */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  // Behind Vercel, redirect to the user-facing host, not the internal one.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin;

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${base}${next}`);
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(`${base}${next}`);
    }
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
