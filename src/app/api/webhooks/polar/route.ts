/**
 * POST /api/webhooks/polar — Polar's order.paid event credits the coin ledger
 * (docs/24_PAYMENTS_POLAR_WALKTHROUGH.html). This is the ONLY place purchased
 * coins are created.
 *
 * Signature verification happens inside the Webhooks helper (raw body + the
 * endpoint's signing secret) BEFORE our handler runs; a bad signature is 403'd
 * without touching the DB. Crediting is idempotent at the DB level:
 * coin_ledger_order_uidx allows exactly one credit per Polar order id, so a
 * redelivered webhook dies on 23505 and we treat that as success.
 *
 * Error contract: RETURN normally for unfixable payloads (unknown product,
 * missing user — Polar must not retry those; they're logged for /admin), but
 * THROW on infrastructure failures (missing service role, DB down) so the
 * route 500s and Polar redelivers later.
 */

import { Webhooks } from "@polar-sh/nextjs";

import { recordApiError } from "@/lib/analytics/errorLog";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

/** Pack size for a Polar product id — env-mapped, never from the payload. */
function packCoins(productId: string | null): number | null {
  if (!productId) return null;
  if (productId === process.env.POLAR_PRODUCT_100) return 100;
  if (productId === process.env.POLAR_PRODUCT_250) return 250;
  if (productId === process.env.POLAR_PRODUCT_700) return 700;
  return null;
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
  onOrderPaid: async ({ data: order }) => {
    const metaUserId = order.metadata?.userId;
    const userId =
      order.customer.externalId ??
      (typeof metaUserId === "string" ? metaUserId : undefined);
    const coins = packCoins(order.productId);

    if (!order.paid || !userId || !coins) {
      // Unfixable payload — log loudly, return 200 so Polar doesn't retry.
      const detail = `order ${order.id}: paid=${order.paid} product=${order.productId} user=${userId ?? "none"}`;
      console.error("[polar] order.paid ignored (unmapped):", detail);
      await recordApiError("polar-webhook", new Error(`Unmapped order.paid — ${detail}`));
      return;
    }

    const admin = getSupabaseServiceRoleClient();
    if (!admin) {
      throw new Error(`[polar] SUPABASE_SERVICE_ROLE_KEY missing — cannot credit order ${order.id}`);
    }
    const { error } = await admin.from("coin_ledger").insert({
      user_id: userId,
      delta: coins,
      bucket: "purchased",
      reason: "order",
      order_id: order.id,
    });
    // 23505 = unique violation on coin_ledger_order_uidx: a redelivered
    // webhook for an order that's already credited — success, not an error.
    if (error && error.code !== "23505") {
      throw new Error(`[polar] credit failed for order ${order.id}: ${error.message}`);
    }
  },
});
