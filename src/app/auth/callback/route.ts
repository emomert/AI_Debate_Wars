/**
 * Auth callback (docs/19). Handles BOTH sign-in flows:
 *   - OAuth (Google/GitHub) and PKCE email links return ?code= → exchangeCodeForSession
 *   - token-hash style email links return ?token_hash=&type= → verifyOtp
 *     (the branded email templates link here on our own domain, carrying the
 *     original callback URL as ?redirect_to= — see resolveAuthNext)
 * On success redirects to a sanitized same-origin `next` path (default "/") —
 * except first-time users (no profiles row yet), who are routed through
 * /welcome to create their fighter card. Password-recovery links carry
 * next=/reset-password and bypass the welcome detour.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAuthNext } from "@/lib/utils/url";

/** Where a freshly signed-in session should land (welcome for new users). */
async function landingPath(supabase: SupabaseClient, next: string): Promise<string> {
  // The recovery flow must reach the set-new-password form unconditionally.
  if (next === "/reset-password") return next;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return next;
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile) return next;
  return `/welcome${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = resolveAuthNext(searchParams);

  // Behind Vercel, redirect to the user-facing host, not the internal one.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin;

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${base}${await landingPath(supabase, next)}`);
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) {
        return NextResponse.redirect(`${base}${await landingPath(supabase, next)}`);
      }
    }
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
