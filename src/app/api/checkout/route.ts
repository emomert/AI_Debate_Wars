/**
 * GET /api/checkout?pack=100|250|700 — create a Polar checkout session for a
 * coin pack and send the browser there (docs/24_PAYMENTS_POLAR_WALKTHROUGH.html).
 *
 * The client only ever names a PACK; product ids, prices, and coin amounts are
 * resolved server-side — never trust the browser with money math. The signed-in
 * Supabase user rides along as Polar's externalCustomerId so the order.paid
 * webhook can credit the right account without trusting metadata alone.
 * Failures land back on /pricing with a ?checkout= status the page can toast.
 */

import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";

import { recordApiError } from "@/lib/analytics/errorLog";
import { enforceLimits } from "@/lib/security/rateLimit";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const PACK_PRODUCTS: Record<string, string | undefined> = {
  "100": process.env.POLAR_PRODUCT_100,
  "250": process.env.POLAR_PRODUCT_250,
  "700": process.env.POLAR_PRODUCT_700,
};

export async function GET(req: Request): Promise<NextResponse> {
  const back = (status: "unavailable" | "error") =>
    NextResponse.redirect(new URL(`/pricing?checkout=${status}`, req.url));
  try {
    await enforceLimits(req, "checkout");

    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const productId = PACK_PRODUCTS[new URL(req.url).searchParams.get("pack") ?? ""];
    // Fail soft (no throw): missing env just means payments aren't set up in
    // this deployment — the /pricing banner explains, nobody gets charged.
    if (!accessToken || !productId) return back("unavailable");

    const supabase = await getSupabaseServerClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!user) {
      return NextResponse.redirect(new URL("/login?next=/pricing", req.url));
    }

    const polar = new Polar({
      accessToken,
      server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
    });
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: user.id,
      customerEmail: user.email ?? undefined,
      successUrl: new URL("/pricing?checkout=success", req.url).toString(),
      metadata: { userId: user.id },
    });
    return NextResponse.redirect(checkout.url);
  } catch (err) {
    await recordApiError("checkout", err); // owner error log (/admin)
    return back("error");
  }
}
