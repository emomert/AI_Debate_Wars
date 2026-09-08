import "server-only";
import { randomUUID } from "node:crypto";
import type { DebateSession } from "./debateTypes";
import type { GenerateTurnResponse, GenerateVerdictResponse } from "@/lib/api/contracts";
import { canonicalGenerationSession, generationIdentity } from "./generationPolicy";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { COINS_ENABLED } from "@/lib/coins/config";
import { ensureMatchCharged, ensureJudgeCharged, type CoinQuote } from "@/lib/coins/server";
import { matchCoinCost, premiumCoinCost, judgeCoinCost, judgePremiumCoinCost } from "@/lib/coins/economy";
import { MODEL_CATALOG } from "@/lib/models/modelRegistry";
import { resolveAutoJudge } from "@/lib/providers/providerRegistry";
import { summarizeSessionCost } from "@/lib/cost/calculateCost";
import { ProviderError } from "@/lib/utils/errors";

type Response = GenerateTurnResponse | GenerateVerdictResponse;
interface State {
  session: DebateSession;
  identity: string;
  autoJudgeId: string;
  matchQuote: CoinQuote;
  judgeQuotes: Record<string, CoinQuote>;
}
interface Row {
  state: State;
  results: Record<string, Response>;
  revision: number;
  active_key?: string | null;
  lease_token?: string | null;
  lease_until?: string | null;
  attempts: Record<string, number>;
}
// Explicit local-only convenience. Production always requires an authenticated DB owner.
const localRows = new Map<string, Row>();
const unavailable = () => new ProviderError("PROVIDER_ERROR", "Generation storage unavailable");

export interface GenerationClaim {
  session: DebateSession;
  judgeModelId?: string;
  cached?: Response;
  complete(response: Response): Promise<void>;
  fail(unused?: boolean): Promise<void>;
}

/** Owns the transcript, fixed quote and one fenced operation per match across instances. */
export async function claimGeneration(input: DebateSession, turnId?: string): Promise<GenerationClaim> {
  const canonical = canonicalGenerationSession(input);
  const db = getSupabaseServiceRoleClient();
  const local = !db && !COINS_ENABLED && process.env.NODE_ENV !== "production";
  let userId = "local";
  if (!local) {
    if (!db) throw unavailable();
    const auth = await getSupabaseServerClient();
    const result = await auth?.auth.getUser();
    if (!result?.data.user) throw new ProviderError("AUTH_REQUIRED", "Sign in to generate a match");
    userId = result.data.user.id;
  }
  const key = `${userId}:${canonical.id}`;
  let row: Row | undefined;
  if (local) row = localRows.get(key);
  else {
    const { data, error } = await db!.from("generation_matches").select("*")
      .eq("user_id", userId).eq("session_id", canonical.id).maybeSingle();
    if (error) throw unavailable();
    row = data as Row | undefined;
  }
  if (!row) {
    if (turnId !== canonical.turns[0]!.id || !Array.isArray(input.messages) || input.messages.length !== 0) {
      throw new ProviderError("INVALID_SESSION", "Start a new match; no server-owned transcript exists");
    }
    const costInput = { modelAId: canonical.modelA.modelId, modelBId: canonical.modelB.modelId,
      deepDebate: canonical.deepDebate, responseLength: canonical.responseLength };
    const state: State = {
      session: canonical, identity: generationIdentity(canonical), autoJudgeId: resolveAutoJudge(canonical).modelId,
      matchQuote: { total: matchCoinCost(costInput), premium: premiumCoinCost(costInput) },
      judgeQuotes: Object.fromEntries(MODEL_CATALOG.map(m => {
        const judge = { mode: "thirdModel" as const, modelId: m.id };
        return [m.id, { total: judgeCoinCost(judge), premium: judgePremiumCoinCost(judge) }];
      })),
    };
    row = { state, results: {}, revision: 0, attempts: {} };
    if (local) {
      if (localRows.size >= 1000) throw unavailable();
      localRows.set(key, row);
    } else {
      const { error } = await db!.from("generation_matches").upsert(
        { user_id: userId, session_id: canonical.id, state },
        { onConflict: "user_id,session_id", ignoreDuplicates: true });
      if (error) throw unavailable();
      const read = await db!.from("generation_matches").select("*")
        .eq("user_id", userId).eq("session_id", canonical.id).single();
      if (read.error || !read.data) throw unavailable();
      row = read.data as Row;
    }
  }
  if (row.state.identity !== generationIdentity(canonical)) throw new ProviderError("INVALID_SESSION", "Match configuration changed");
  const session = structuredClone(row.state.session);
  session.judge = canonical.judge;
  let judgeModelId: string | undefined;
  if (turnId === undefined) {
    if (!session.judge.enabled || session.judge.mode === "none" || session.messages.length !== 6) {
      throw new ProviderError("INVALID_SESSION", "Judging requires six server-generated turns");
    }
    judgeModelId = session.judge.mode === "auto" ? row.state.autoJudgeId : session.judge.model!.modelId;
  }
  const operation = turnId === undefined ? `judge:${judgeModelId}` : `turn:${turnId}`;
  const cached = row.results[operation];
  if (cached) return { session, judgeModelId, cached, complete: async () => {}, fail: async () => {} };
  if (turnId !== undefined && session.turns[session.messages.length]?.id !== turnId) {
    throw new ProviderError("INVALID_SESSION", "Turns must follow server progress");
  }
  const token = randomUUID();
  let claimStatus: string;
  if (local) {
    if (row.active_key && Date.parse(row.lease_until!) > Date.now()) claimStatus = "busy";
    else if ((row.attempts[operation] ?? 0) >= 3) claimStatus = "exhausted";
    else {
      row.active_key = operation; row.lease_token = token;
      row.lease_until = new Date(Date.now() + 120_000).toISOString();
      row.attempts[operation] = (row.attempts[operation] ?? 0) + 1;
      claimStatus = "claimed";
    }
  } else {
    const { data, error } = await db!.rpc("generation_claim", {
      p_user: userId, p_session: canonical.id, p_revision: row.revision, p_key: operation, p_token: token,
    });
    if (error) throw unavailable();
    claimStatus = data;
  }
  if (claimStatus !== "claimed") {
    throw new ProviderError(claimStatus === "exhausted" ? "INVALID_SESSION" : "TOO_MANY_REQUESTS",
      claimStatus === "exhausted" ? "Generation retry limit reached; start a new match" : "Generation is in progress; retry shortly");
  }
  const finish = async (response?: Response, unused = false) => {
    const state = structuredClone(row!.state);
    if (response && "message" in response) {
      state.session.messages.push(response.message);
      state.session.turns[state.session.messages.length - 1]!.status = "complete";
      state.session.costSummary = summarizeSessionCost(state.session.messages);
      state.session.updatedAt = new Date().toISOString();
    }
    if (local) {
      if (row!.lease_token !== token || Date.parse(row!.lease_until!) <= Date.now()) throw unavailable();
      if (response) { row!.state = state; row!.results[operation] = response; row!.revision++; }
      else if (unused) row!.attempts[operation] = Math.max(0, (row!.attempts[operation] ?? 0) - 1);
      row!.active_key = null; row!.lease_token = null; row!.lease_until = null;
    } else {
      const { data, error } = await db!.rpc("generation_finish", {
        p_user: userId, p_session: canonical.id, p_token: token,
        p_response: response ?? null, p_state: response ? state : null,
        p_unused: unused,
      });
      if (error || data !== true) throw unavailable();
    }
  };
  try {
    // Authentication also applies to the included Auto judge. Completion of six
    // paid server turns is required even when the judge itself costs zero coins.
    await ensureMatchCharged(session, row.state.matchQuote);
    if (judgeModelId) {
      const quote = session.judge.mode === "auto" ? { total: 0, premium: 0 } : row.state.judgeQuotes[judgeModelId];
      if (!quote) throw new ProviderError("INVALID_MODEL", "Start a new match to use this judge");
      await ensureJudgeCharged(session, judgeModelId, quote);
    }
  } catch (error) {
    await finish(undefined, true).catch(() => {});
    throw error;
  }
  return { session, judgeModelId, complete: finish, fail: unused => finish(undefined, unused).catch(() => {}) };
}
