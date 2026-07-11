import "server-only";

/**
 * Server-side analytics writer. Called best-effort from the verdict route (the
 * match-finalize point — the judge is mandatory, so every match ends here).
 * Resolves the caller's user id from the cookie session, builds the dimensions-
 * only card, and upserts it via the service-role key. Analytics is OFF unless
 * SUPABASE_SERVICE_ROLE_KEY is set; this never throws into the caller.
 */
import type { DebateSession } from "@/lib/debate/debateTypes";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { buildMatchCard } from "@/lib/analytics/matchCard";

export async function recordMatchAnalytics(
  session: DebateSession,
  opts: { judgeModelId: string; verdictCost: number },
): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return; // analytics disabled unless service-role configured

  try {
    // Best-effort user id (null for anonymous / pre-paywall play). Uses the
    // cookie-scoped client purely to read auth.uid(); the WRITE is service-role.
    let userId: string | null = null;
    const cookieClient = await getSupabaseServerClient();
    if (cookieClient) {
      const { data } = await cookieClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const card = buildMatchCard(session, { ...opts, userId });
    const { error } = await admin
      .from("match_analytics")
      .upsert(card, { onConflict: "app_session_id" });
    if (error) console.error("[analytics] upsert failed:", error.message);
  } catch (err) {
    console.error("[analytics] recordMatchAnalytics threw:", err);
  }
}
