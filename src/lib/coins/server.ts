/**
 * Server-side coin charging (docs/23_COINS.md). Called by the turn route on
 * EVERY turn request and by the verdict route on every verdict — the DB makes
 * each charge idempotent per (user, charge key), so only the first turn / a new
 * judge actually pays. Prices are computed HERE from the session the models
 * will actually run with — never trusted from client-supplied numbers.
 *
 * The charge KEY is HMAC-signed over (session id, amount, match/transcript
 * content) with a server-only secret — see chargeKey.ts. That is what stops a
 * hostile client (coin_spend_match is reachable over PostgREST) from pre-seeding
 * a real match's ledger row to force a free "ALREADY", and from replaying one
 * paid key across DIFFERENT matches. The DB function is additionally hardened
 * (migration 0013) to ignore a client-supplied daily allowance.
 */

import "server-only";

import { COINS_ENABLED, FREE_DAILY_COINS } from "./config";
import {
  judgeCoinCost,
  judgePremiumCoinCost,
  matchCoinCost,
  premiumCoinCost,
} from "./economy";
import {
  judgeChargeKey,
  matchChargeKey,
  matchContentFingerprint,
  transcriptFingerprint,
} from "./chargeKey";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ProviderError } from "@/lib/utils/errors";
import type { DebateSession } from "@/lib/debate/debateTypes";

interface SpendRow {
  ok: boolean;
  result: "CHARGED" | "ALREADY" | "AUTH" | "BAD_INPUT" | "INSUFFICIENT";
  purchased_balance: number;
  daily_spent: number;
}

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

/**
 * Secret used to sign charge keys (chargeKey.ts). Reuses the service-role key —
 * server-only, high-entropy, and already present wherever coins run against
 * Supabase in production; an optional COIN_CHARGE_SECRET overrides it. Fails
 * CLOSED if neither is set while coins are on: an unsigned (forgeable) key is
 * worse than a stopped match.
 */
function chargeSecret(): string {
  const s = process.env.COIN_CHARGE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) {
    throw new ProviderError(
      "PROVIDER_ERROR",
      "coin charge secret not configured (set SUPABASE_SERVICE_ROLE_KEY or COIN_CHARGE_SECRET)",
    );
  }
  return s;
}

/** Resolve the signed-in user's Supabase client, or fail closed. */
async function requireCoinClient(authMessage: string): Promise<ServerSupabase> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    throw new ProviderError("PROVIDER_ERROR", "coin ledger unavailable (Supabase not configured)");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ProviderError("AUTH_REQUIRED", authMessage);
  return supabase;
}

/**
 * Ensure this session's match is paid for (fighters + Deep Debate; the judge is
 * charged separately at the verdict route). No-op while COINS_ENABLED is off.
 * Throws ProviderError: AUTH_REQUIRED (signed out), OUT_OF_COINS (balance),
 * PROVIDER_ERROR (ledger unreachable — fail CLOSED; coins are money).
 */
export async function ensureMatchCharged(session: DebateSession): Promise<void> {
  if (!COINS_ENABLED) return;

  const costInput = {
    modelAId: session.modelA.modelId,
    modelBId: session.modelB.modelId,
    deepDebate: session.deepDebate,
    responseLength: session.responseLength,
  };
  const total = matchCoinCost(costInput);
  const premium = premiumCoinCost(costInput);

  const fingerprint = matchContentFingerprint({
    topic: session.topic,
    modelAId: session.modelA.modelId,
    modelBId: session.modelB.modelId,
    responseLength: session.responseLength,
    deepDebate: session.deepDebate,
    roundCount: session.roundCount,
  });
  const key = matchChargeKey(chargeSecret(), session.id, total, fingerprint);

  const supabase = await requireCoinClient("matches require a signed-in account");
  await spend(supabase, key, total, premium);
}

/**
 * Charge the JUDGE (docs/23_COINS.md). Priced from the RESOLVED judge, so it can
 * never be dodged with a client-supplied "first verdict" ordinal: the Auto judge
 * (and a fighter-as-judge) is free; a picked third-model judge costs its coin
 * price. The charge is keyed on (session, judge, transcript), so a re-sent
 * verdict or a repeat of the SAME judge is idempotent (free), while SWITCHING to
 * a different judge charges — each distinct picked judge is paid for once.
 */
export async function ensureJudgeCharged(
  session: DebateSession,
  judgeModelId: string,
): Promise<void> {
  if (!COINS_ENABLED) return;

  const judge = { mode: session.judge.mode, modelId: judgeModelId };
  const cost = judgeCoinCost(judge);
  if (cost <= 0) return; // Auto / fighter-as-judge is included free.
  const premium = judgePremiumCoinCost(judge);

  const fingerprint = transcriptFingerprint(
    session.messages.map((m) => ({ speaker: m.speaker, content: m.content })),
  );
  const key = judgeChargeKey(chargeSecret(), session.id, judgeModelId, fingerprint);

  const supabase = await requireCoinClient("re-judging requires a signed-in account");
  await spend(supabase, key, cost, premium);
}

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
