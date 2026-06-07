/**
 * Supabase config (docs/19). The URL + publishable/anon key are PUBLIC
 * (NEXT_PUBLIC_*, inlined at build, protected by row-level security). Auth is
 * OPTIONAL: when these aren't set the app runs fine signed-out — every Supabase
 * helper short-circuits via isSupabaseConfigured() so a missing config can never
 * crash a page or an API route.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
