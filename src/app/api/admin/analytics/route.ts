/**
 * GET /api/admin/analytics — owner-only. Authenticates via the cookie session,
 * checks the ADMIN_USER_IDS allowlist, and (for admins) reads the flat analytics
 * cards with the service-role key to bypass RLS. Returns the RAW cards (newest
 * first, capped) so the interactive dashboard can filter + re-aggregate in the
 * browser without a round trip per filter — the cards are dimensions-only, so
 * even a large set is small. Non-admins get a 404 so the route's existence
 * isn't revealed.
 */
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isAdminUserId } from "@/lib/admin/access";
import type { StoredMatchCard } from "@/lib/analytics/aggregate";
import type { ApiErrorRow } from "@/lib/analytics/errorLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS =
  "app_session_id,user_id,mode,round_count,battle_count,deep_debate,tone,response_length,pace,language,model_a_id,model_b_id,judge_mode,judge_model_id,winner,score_a,score_b,match_cost,verdict_cost,cost_openai,cost_deepseek,cost_openrouter,cost_search,created_at";

// Dimensions-only rows are ~300 bytes each; 20k ≈ a few MB — fine for an
// owner-only page. Revisit (server-side aggregation / pagination) at scale.
const MAX_CARDS = 20_000;

// Recent API errors shown on the dashboard (spot recurring failures).
const MAX_ERRORS = 300;

export interface AdminAnalyticsResponse {
  cards: StoredMatchCard[];
  /** True when MAX_CARDS was hit — older matches are missing from the payload. */
  truncated: boolean;
  errors: ApiErrorRow[];
}

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

  const [cardsRes, errorsRes] = await Promise.all([
    admin
      .from("match_analytics")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(MAX_CARDS),
    admin
      .from("api_errors")
      .select("route,code,message,model_id,provider,status,created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_ERRORS),
  ]);
  if (cardsRes.error) {
    return NextResponse.json({ error: cardsRes.error.message }, { status: 500 });
  }
  if (errorsRes.error) console.error("[admin] error-log read failed:", errorsRes.error.message);

  const cards = (cardsRes.data ?? []) as unknown as StoredMatchCard[];
  const res: AdminAnalyticsResponse = {
    cards,
    truncated: cards.length >= MAX_CARDS,
    errors: (errorsRes.data ?? []) as unknown as ApiErrorRow[],
  };
  return NextResponse.json(res);
}
