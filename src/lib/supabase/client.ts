"use client";

/**
 * Browser Supabase client (docs/19). Singleton so the whole tab shares one
 * client + auth state. Returns null when Supabase isn't configured, so callers
 * treat that as "signed out / auth disabled" rather than crashing.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cached) {
    cached = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return cached;
}
