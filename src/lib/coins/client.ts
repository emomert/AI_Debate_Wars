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
