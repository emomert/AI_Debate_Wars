import "server-only";

/**
 * API error logger for the owner dashboard — records WHICH calls fail (route,
 * normalized code, model, backend) so recurring failures (e.g. a model that
 * keeps timing out) become visible. Dimensions + server-generated error text
 * only; never topics/transcripts/prompts. Best-effort: no-ops without the
 * service-role key and never throws into the calling route.
 */
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getModelById } from "@/lib/models/modelRegistry";
import { httpStatusForCode, toAppError } from "@/lib/utils/errors";

const MESSAGE_MAX = 300;

export interface ApiErrorRow {
  route: string;
  code: string;
  message: string;
  model_id: string | null;
  provider: string | null;
  status: number | null;
  created_at: string;
}

export async function recordApiError(
  route: "turn" | "verdict" | "topic" | "tts" | "checkout" | "polar-webhook",
  err: unknown,
  ctx: { modelId?: string } = {},
): Promise<void> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return; // logging disabled unless service-role configured

  try {
    const appErr = toAppError(err);
    const { error } = await admin.from("api_errors").insert({
      route,
      code: appErr.code,
      message: (appErr.message ?? "").slice(0, MESSAGE_MAX),
      model_id: ctx.modelId ?? null,
      provider: ctx.modelId ? (getModelById(ctx.modelId)?.providerId ?? null) : null,
      status: httpStatusForCode(appErr.code),
    });
    if (error) console.error("[error-log] insert failed:", error.message);
  } catch (e) {
    console.error("[error-log] recordApiError threw:", e);
  }
}
