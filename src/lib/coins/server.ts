/**
 * Server-side coin charging (docs/23_COINS.md). Called by the turn route on
 * EVERY turn request — the DB makes the charge idempotent per (user, charge
 * key), so only the first turn of a session actually pays. The price is
 * computed HERE from the session the models will actually run with — never
 * trusted from client-supplied numbers.
 *
 * Charge key = `${session.id}:${total}c`: if a crafted client mutates the
 * fighters/format mid-session to smuggle pricier models onto an already-paid
 * session id, the total changes and a fresh charge lands instead of a free
 * ride. Same-price fighter swaps stay covered by the original charge.
 */

import "server-only";

import { COINS_ENABLED, FREE_DAILY_COINS, FREE_MAX_FIGHTER_COINS } from "./config";
import { matchCoinCost, premiumCoinCost, rejudgeCoinCost } from "./economy";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ProviderError } from "@/lib/utils/errors";
import type { DebateSession } from "@/lib/debate/debateTypes";

interface SpendRow {
  ok: boolean;
  result: "CHARGED" | "ALREADY" | "AUTH" | "BAD_INPUT" | "INSUFFICIENT";
  purchased_balance: number;
  daily_spent: number;
}

/**
 * Ensure this session's match is paid for. No-op while COINS_ENABLED is off.
 * Throws ProviderError: AUTH_REQUIRED (signed out), OUT_OF_COINS (balance),
 * PROVIDER_ERROR (ledger unreachable — fail CLOSED; coins are money).
 */
export async function ensureMatchCharged(session: DebateSession): Promise<void> {
  if (!COINS_ENABLED) return;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    throw new ProviderError("PROVIDER_ERROR", "coin ledger unavailable (Supabase not configured)");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new ProviderError("AUTH_REQUIRED", "matches require a signed-in account");
  }

  const input = {
    modelAId: session.modelA.modelId,
    modelBId: session.modelB.modelId,
    deepDebate: session.deepDebate,
    responseLength: session.responseLength,
    judge: {
      mode: session.judge.mode === "thirdModel" ? ("thirdModel" as const) : ("auto" as const),
      modelId: session.judge.model?.modelId,
    },
  };
  const total = matchCoinCost(input);
  const premium = premiumCoinCost(input);
  await spend(supabase, `${session.id}:${total}c`, total, premium);
}

/**
 * Charge a RE-JUDGE (docs/23_COINS.md; owner 7/12 — never free). Detected by
 * the session already carrying a verdict; the FIRST verdict of a match is
 * covered by the match charge. Idempotent per (session, judge, ordinal) so a
 * failed call retries free, while the next re-judge (or a judge switch)
 * charges again. NOTE: the ordinal comes from the client-held session (server
 * keeps no match state — same trust class as the tracked P1-4 gap).
 */
export async function ensureRejudgeCharged(
  session: DebateSession,
  judgeModelId: string,
): Promise<void> {
  if (!COINS_ENABLED) return;
  const priorVerdicts = (session.pastVerdicts?.length ?? 0) + (session.verdict ? 1 : 0);
  if (priorVerdicts === 0) return; // first verdict — included in the match price

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    throw new ProviderError("PROVIDER_ERROR", "coin ledger unavailable (Supabase not configured)");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ProviderError("AUTH_REQUIRED", "re-judging requires a signed-in account");

  const cost = rejudgeCoinCost(judgeModelId);
  const premium = cost > FREE_MAX_FIGHTER_COINS ? cost : 0;
  await spend(supabase, `${session.id}:rejudge:${judgeModelId}:${priorVerdicts}`, cost, premium);
}

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

async function spend(
  supabase: ServerSupabase,
  chargeKey: string,
  total: number,
  premium: number,
): Promise<void> {
  const { data, error } = await supabase.rpc("coin_spend_match", {
    p_session_id: chargeKey,
    p_total: total,
    p_premium: premium,
    p_allowance: FREE_DAILY_COINS,
  });
  if (error) {
    throw new ProviderError("PROVIDER_ERROR", `coin charge failed: ${error.message}`);
  }
  const row = (Array.isArray(data) ? data[0] : data) as SpendRow | undefined;
  if (!row) throw new ProviderError("PROVIDER_ERROR", "coin charge returned no result");
  if (row.ok) return;
  if (row.result === "AUTH") throw new ProviderError("AUTH_REQUIRED");
  if (row.result === "INSUFFICIENT") {
    throw new ProviderError(
      "OUT_OF_COINS",
      `needs ${total} coins (premium ${premium}); purchased balance ${row.purchased_balance}`,
    );
  }
  throw new ProviderError("INVALID_REQUEST", `coin charge rejected: ${row.result}`);
}
