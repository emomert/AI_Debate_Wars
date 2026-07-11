/**
 * GET /api/admin/analytics — owner-only. Authenticates via the cookie session,
 * checks the ADMIN_USER_IDS allowlist, and (for admins) reads the flat analytics
 * cards with the service-role key to bypass RLS, then returns the aggregated
 * dashboard. Non-admins get a 404 so the route's existence isn't revealed.
 */
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isAdminUserId } from "@/lib/admin/access";
import { buildDashboard, type StoredMatchCard } from "@/lib/analytics/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS =
  "app_session_id,user_id,mode,round_count,battle_count,deep_debate,tone,response_length,pace,language,model_a_id,model_b_id,judge_mode,judge_model_id,winner,score_a,score_b,match_cost,verdict_cost,created_at";

export async function GET(_req: Request): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  if (!isAdminUserId(data.user?.id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "analytics-unconfigured" }, { status: 503 });
  }

  const { data: rows, error } = await admin
    .from("match_analytics")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50_000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(buildDashboard((rows ?? []) as StoredMatchCard[]));
}
