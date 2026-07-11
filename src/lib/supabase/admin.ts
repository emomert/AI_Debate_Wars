import "server-only";

/**
 * Service-role Supabase client — SERVER-ONLY, bypasses RLS. Used by exactly two
 * places: the analytics writer (server-side match-card upsert) and the owner
 * admin route (cross-user aggregate reads). The key must NEVER reach the client;
 * it is read from SUPABASE_SERVICE_ROLE_KEY (not a NEXT_PUBLIC_* var). Returns
 * null when unconfigured so analytics/admin degrade gracefully instead of
 * crashing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/supabase/env";

export function getSupabaseServiceRoleClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
