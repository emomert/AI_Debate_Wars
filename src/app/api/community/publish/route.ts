/**
 * POST /api/community/publish — share a finished match to the community hub
 * (docs/20). Auth required. The sanitized snapshot is built SERVER-SIDE from
 * the submitted session, honoring the sharer's choices (hide model names,
 * exclude the verdict) — hidden data never reaches the public table at all.
 * Republishing the same session UPDATES the existing post (same /m/ link).
 */

import { NextResponse } from "next/server";

import type {
  ApiErrorBody,
  PublishMatchRequest,
  PublishMatchResponse,
} from "@/lib/api/contracts";
import type { PublishOptions } from "@/lib/community/types";
import { buildSharedSnapshot } from "@/lib/community/snapshot";
import {
  assertConsistentTranscript,
  assertValidSession,
} from "@/lib/debate/validators";
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

// Keeps a healthy margin under the 400KB DB constraint on the snapshot column.
const MAX_SNAPSHOT_BYTES = 350_000;

/** Short random URL slug, e.g. "Yx3kP9q_T2ab" (12 base64url chars). */
function newSlug(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function normalizeOptions(raw: unknown): PublishOptions {
  const o = (raw ?? {}) as Partial<PublishOptions>;
  if (o.visibility !== "public" && o.visibility !== "unlisted") {
    throw new ProviderError("INVALID_REQUEST", "Invalid visibility");
  }
  return {
    visibility: o.visibility,
    showModels: o.showModels === true,
    includeVerdict: o.includeVerdict === true,
  };
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await enforceLimits(req, "publish");

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      throw new ProviderError("INVALID_REQUEST", "Community features are not configured");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ProviderError("AUTH_REQUIRED", "Sign in to share a match");

    const body = await readJsonBody<PublishMatchRequest>(req);
    const session = body?.session;
    assertValidSession(session);
    assertConsistentTranscript(session);
    if (session.status !== "complete") {
      throw new ProviderError("INVALID_REQUEST", "Only completed matches can be shared");
    }
    if (session.messages.length === 0) {
      throw new ProviderError("INVALID_REQUEST", "Match transcript is empty");
    }

    const options = normalizeOptions(body?.options);
    // "Include the verdict" is meaningless without one — store the truth.
    options.includeVerdict = options.includeVerdict && Boolean(session.verdict);

    const snapshot = buildSharedSnapshot(session, options);
    if (JSON.stringify(snapshot).length > MAX_SNAPSHOT_BYTES) {
      throw new ProviderError("INVALID_REQUEST", "Match is too large to share");
    }

    // Commenting/posting identity — make sure a profile row exists.
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    if (profileErr) {
      console.error("[community/publish] profile upsert failed:", profileErr.message);
      throw new ProviderError("UNKNOWN_ERROR", "Could not prepare your profile");
    }

    const row = {
      topic: session.topic,
      visibility: options.visibility,
      show_models: options.showModels,
      include_verdict: options.includeVerdict,
      model_a: options.showModels ? session.modelA.displayName : null,
      model_b: options.showModels ? session.modelB.displayName : null,
      winner: options.includeVerdict ? (session.verdict?.winner ?? null) : null,
      round_count: session.roundCount,
      deep_debate: session.deepDebate,
      snapshot,
    };

    // Republish → update the existing post in place (the /m/ link survives).
    const { data: existing, error: findErr } = await supabase
      .from("shared_matches")
      .select("id")
      .eq("owner_id", user.id)
      .eq("app_session_id", session.id)
      .maybeSingle();
    if (findErr) {
      console.error("[community/publish] lookup failed:", findErr.message);
      throw new ProviderError("UNKNOWN_ERROR", "Could not publish the match");
    }

    if (existing) {
      const { error } = await supabase
        .from("shared_matches")
        .update(row)
        .eq("id", existing.id);
      if (error) {
        console.error("[community/publish] update failed:", error.message);
        throw new ProviderError("UNKNOWN_ERROR", "Could not update the shared match");
      }
      const res: PublishMatchResponse = { id: existing.id, updated: true };
      return NextResponse.json(res);
    }

    // Insert with a fresh slug; on the (astronomically rare) collision, retry.
    let insertError: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const id = newSlug();
      const { error } = await supabase
        .from("shared_matches")
        .insert({ id, owner_id: user.id, app_session_id: session.id, ...row });
      if (!error) {
        const res: PublishMatchResponse = { id, updated: false };
        return NextResponse.json(res);
      }
      insertError = error.message;
      if (error.code !== "23505") break; // not a key collision — don't retry
    }
    console.error("[community/publish] insert failed:", insertError);
    throw new ProviderError("UNKNOWN_ERROR", "Could not publish the match");
  } catch (err) {
    const appErr = toAppError(err);
    const errorBody: ApiErrorBody = { error: appErr };
    return NextResponse.json(errorBody, { status: httpStatusForCode(appErr.code) });
  }
}
