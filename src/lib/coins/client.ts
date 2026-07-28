/**
 * Browser-side coin helpers (docs/23_COINS.md): read the balance via the
 * coin_status RPC and broadcast balance changes so the header chip refreshes
 * after a charge/redemption without a page reload.
 *
 * The daily allowance is CLAIM-GATED (2026-07-28, migration 0014):
 * coin_status() now reports claimed_today, and dailyRemaining is 0 until
 * today's claim row exists — this is what stops the header chip from
 * advertising coins the user has not pressed "claim" for yet.
 */

import { FREE_DAILY_COINS } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CoinStatus {
  /** Non-expiring spendable coins (purchased + promo). */
  purchased: number;
  /** Daily free coins still available today (0 unless claimed_today). */
  dailyRemaining: number;
  /** Whether today's (UTC) daily allowance has been claimed. */
  claimedToday: boolean;
}

export async function fetchCoinStatus(supabase: SupabaseClient): Promise<CoinStatus | null> {
  const { data, error } = await supabase.rpc("coin_status");
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { purchased_balance: number; daily_spent: number; claimed_today: boolean }
    | undefined;
  if (!row) return null;
  return {
    purchased: row.purchased_balance,
    dailyRemaining: row.claimed_today ? Math.max(0, FREE_DAILY_COINS - row.daily_spent) : 0,
    claimedToday: row.claimed_today,
  };
}

export type ClaimDailyResult =
  | { ok: true; result: "CLAIMED" | "ALREADY"; coins: number; status: CoinStatus }
  | { ok: false; result: "AUTH" | "RATE_LIMITED" | "UNKNOWN" };

/**
 * Claim today's daily allowance (coin_claim_daily RPC — migration 0014).
 * Never inserts into coin_ledger: it only records that today was claimed,
 * gating the existing (allowance − daily_spent) computation. The RPC returns
 * the post-claim status numbers, so the caller can update its own display
 * without a second `coin_status` round trip — callers should still fire
 * `notifyCoinsChanged()` so OTHER mounted components (e.g. the header chip)
 * refresh too.
 */
export async function claimDaily(supabase: SupabaseClient): Promise<ClaimDailyResult> {
  const { data, error } = await supabase.rpc("coin_claim_daily");
  if (error) return { ok: false, result: "UNKNOWN" };
  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        ok: boolean;
        result: string;
        coins: number;
        purchased_balance: number;
        daily_spent: number;
      }
    | undefined;
  if (!row) return { ok: false, result: "UNKNOWN" };
  if (row.ok && (row.result === "CLAIMED" || row.result === "ALREADY")) {
    return {
      ok: true,
      result: row.result,
      coins: row.coins,
      status: {
        purchased: row.purchased_balance,
        dailyRemaining: Math.max(0, FREE_DAILY_COINS - row.daily_spent),
        claimedToday: true,
      },
    };
  }
  if (row.result === "AUTH" || row.result === "RATE_LIMITED") {
    return { ok: false, result: row.result };
  }
  return { ok: false, result: "UNKNOWN" };
}

/** Fired after anything that changes the balance (charge, promo, purchase). */
export const COINS_CHANGED_EVENT = "ada:coins-changed";

export function notifyCoinsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(COINS_CHANGED_EVENT));
}

/**
 * Fired the MOMENT a spend is set in motion, carrying the amount, so the header
 * chip can drop instantly instead of waiting for the round trip.
 *
 * Why this exists: a match is charged server-side at the very start of the turn
 * route, but the client only learns the new balance when it re-reads
 * `coin_status`. The first turn takes seconds of model generation, so a
 * refresh-on-response alone leaves the chip stale for the whole first turn —
 * the balance looked like it dropped late. The listener applies this amount
 * optimistically and the next real fetch (fired on turn success) replaces it
 * with the authoritative number.
 */
export const COINS_SPENT_EVENT = "ada:coins-spent";

export function notifyCoinsSpent(amount: number): void {
  if (typeof window === "undefined" || !Number.isFinite(amount) || amount <= 0) return;
  window.dispatchEvent(new CustomEvent(COINS_SPENT_EVENT, { detail: { amount } }));
}
