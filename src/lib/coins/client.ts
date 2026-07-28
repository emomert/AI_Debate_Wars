/**
 * Browser-side coin helpers (docs/23_COINS.md): read the balance via the
 * coin_status RPC and broadcast balance changes so the header chip refreshes
 * after a charge/redemption without a page reload.
 */

import { FREE_DAILY_COINS } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CoinStatus {
  /** Non-expiring spendable coins (purchased + promo). */
  purchased: number;
  /** Daily free coins still available today (allowance − today's daily spend). */
  dailyRemaining: number;
}

export async function fetchCoinStatus(supabase: SupabaseClient): Promise<CoinStatus | null> {
  const { data, error } = await supabase.rpc("coin_status");
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { purchased_balance: number; daily_spent: number }
    | undefined;
  if (!row) return null;
  return {
    purchased: row.purchased_balance,
    dailyRemaining: Math.max(0, FREE_DAILY_COINS - row.daily_spent),
  };
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
