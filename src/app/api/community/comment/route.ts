/**
 * POST /api/community/comment — add a comment to a shared match (docs/20).
 * Auth required. Writes go through the add_comment() SECURITY DEFINER RPC so
 * unlisted posts can be commented on (knowing the link is the capability) and
 * the post's comment counter stays exact via the table trigger.
 */

import { NextResponse } from "next/server";

import type {
  AddCommentRequest,
  AddCommentResponse,
  ApiErrorBody,
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
const MAX_COMMENT_CHARS = 500;

function rpcError(message: string): ProviderError {
  if (message.includes("AUTH_REQUIRED")) {
    return new ProviderError("AUTH_REQUIRED", "Sign in to comment");
  }
  if (message.includes("NOT_FOUND")) {
    return new ProviderError("NOT_FOUND", "Shared match not found");
  }
  if (message.includes("INVALID_BODY")) {
    return new ProviderError("INVALID_REQUEST", "Invalid comment text");
  }
  return new ProviderError("UNKNOWN_ERROR", "Could not post the comment");
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await enforceLimits(req, "comment");

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      throw new ProviderError("INVALID_REQUEST", "Community features are not configured");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ProviderError("AUTH_REQUIRED", "Sign in to comment");

    const body = await readJsonBody<AddCommentRequest>(req);
    if (typeof body?.postId !== "string" || !POST_ID_PATTERN.test(body.postId)) {
      throw new ProviderError("INVALID_REQUEST", "Invalid post id");
    }
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    if (text.length < 1 || text.length > MAX_COMMENT_CHARS) {
      throw new ProviderError("INVALID_REQUEST", "Comment must be 1–500 characters");
    }

    const { data, error } = await supabase.rpc("add_comment", {
      p_post_id: body.postId,
      p_body: text,
    });
    if (error) {
      console.error("[community/comment] add_comment failed:", error.message);
      throw rpcError(error.message);
    }
    const inserted = (Array.isArray(data) ? data[0] : data) as
      | { id: string; created_at: string }
      | undefined;
    if (!inserted) throw new ProviderError("UNKNOWN_ERROR", "Could not post the comment");

    const res: AddCommentResponse = { id: inserted.id, createdAt: inserted.created_at };
    return NextResponse.json(res);
  } catch (err) {
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
