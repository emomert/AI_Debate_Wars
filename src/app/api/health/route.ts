/**
 * GET /api/health — reports which providers are usable right now so the UI can
 * show "needs API key" hints and pick sensible defaults. Never returns the keys
 * themselves, only booleans.
 */

import { NextResponse } from "next/server";

import type { HealthResponse } from "@/lib/api/contracts";
import { providerAvailability } from "@/lib/providers/providerRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const providers = providerAvailability();
  const live = providers.openai || providers.deepseek || providers.openrouter;
  const res: HealthResponse = {
    ok: true,
    mode: live ? "live" : "no-keys",
    providers,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(res);
}
