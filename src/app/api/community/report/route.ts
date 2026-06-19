/**
 * POST /api/community/report — flag a shared match or comment for review (P0-8,
 * DSA Art. 16 notice-and-action). Auth required. Writes through the add_report()
 * SECURITY DEFINER RPC (the reports table is otherwise deny-all). Idempotent per
 * user+target. Operators review/remove via scripts/admin-takedown.mjs.
 */

import { NextResponse } from "next/server";

import type {
  ApiErrorBody,
  ReportContentRequest,
  ReportContentResponse,
} from "@/lib/api/contracts";
import { readJsonBody } from "@/lib/api/serverBody";
import { enforceLimits } from "@/lib/security/rateLimit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  ProviderError,
  httpStatusForCode,
  toAppError,
} from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POST_ID_PATTERN = /^[A-Za-z0-9_-]{8,24}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REASON_CHARS = 500;

function rpcError(message: string): ProviderError {
  if (message.includes("AUTH_REQUIRED")) {
    return new ProviderError("AUTH_REQUIRED", "Sign in to report");
  }
  if (message.includes("NOT_FOUND")) {
    return new ProviderError("NOT_FOUND", "That content no longer exists");
  }
  if (message.includes("INVALID_BODY")) {
    return new ProviderError("INVALID_REQUEST", "Invalid report reason");
  }
  return new ProviderError("UNKNOWN_ERROR", "Could not file the report");
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await enforceLimits(req, "report");

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      throw new ProviderError("INVALID_REQUEST", "Community features are not configured");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ProviderError("AUTH_REQUIRED", "Sign in to report");

    const body = await readJsonBody<ReportContentRequest>(req);
    if (typeof body?.postId !== "string" || !POST_ID_PATTERN.test(body.postId)) {
      throw new ProviderError("INVALID_REQUEST", "Invalid post id");
    }
    let commentId: string | null = null;
    if (body.commentId !== undefined && body.commentId !== null) {
      if (typeof body.commentId !== "string" || !UUID_PATTERN.test(body.commentId)) {
        throw new ProviderError("INVALID_REQUEST", "Invalid comment id");
      }
      commentId = body.commentId;
    }
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 1 || reason.length > MAX_REASON_CHARS) {
      throw new ProviderError("INVALID_REQUEST", "Report reason must be 1–500 characters");
    }

    const { error } = await supabase.rpc("add_report", {
      p_post_id: body.postId,
      p_comment_id: commentId,
      p_reason: reason,
    });
    if (error) {
      console.error("[community/report] add_report failed:", error.message);
      throw rpcError(error.message);
    }

    const res: ReportContentResponse = { ok: true };
    return NextResponse.json(res);
  } catch (err) {
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
