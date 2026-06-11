/**
 * POST /api/community/vote — cast or change a side-vote ("who won?") on a
 * shared match (docs/20). Auth required; one vote per user per post, enforced
 * by the cast_vote() SECURITY DEFINER RPC, which also keeps the public tally
 * counters atomic and returns the fresh counts.
 */

import { NextResponse } from "next/server";

import type {
  ApiErrorBody,
  CastVoteRequest,
  CastVoteResponse,
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
const CHOICES = new Set(["a", "b", "tie"]);

/** Map the RPC's raised exceptions back to app error codes. */
function rpcError(message: string): ProviderError {
  if (message.includes("AUTH_REQUIRED")) {
    return new ProviderError("AUTH_REQUIRED", "Sign in to vote");
  }
  if (message.includes("NOT_FOUND")) {
    return new ProviderError("NOT_FOUND", "Shared match not found");
  }
  return new ProviderError("UNKNOWN_ERROR", "Could not register the vote");
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await enforceLimits(req, "vote");

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      throw new ProviderError("INVALID_REQUEST", "Community features are not configured");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ProviderError("AUTH_REQUIRED", "Sign in to vote");

    const body = await readJsonBody<CastVoteRequest>(req);
    if (typeof body?.postId !== "string" || !POST_ID_PATTERN.test(body.postId)) {
      throw new ProviderError("INVALID_REQUEST", "Invalid post id");
    }
    if (typeof body?.choice !== "string" || !CHOICES.has(body.choice)) {
      throw new ProviderError("INVALID_REQUEST", "Invalid vote choice");
    }

    const { data, error } = await supabase.rpc("cast_vote", {
      p_post_id: body.postId,
      p_choice: body.choice,
    });
    if (error) {
      console.error("[community/vote] cast_vote failed:", error.message);
      throw rpcError(error.message);
    }
    const counts = (Array.isArray(data) ? data[0] : data) as
      | { vote_a: number; vote_b: number; vote_tie: number; vote_count: number }
      | undefined;
    if (!counts) throw new ProviderError("NOT_FOUND", "Shared match not found");

    const res: CastVoteResponse = {
      tally: {
        a: counts.vote_a,
        b: counts.vote_b,
        tie: counts.vote_tie,
        total: counts.vote_count,
      },
    };
    return NextResponse.json(res);
  } catch (err) {
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
