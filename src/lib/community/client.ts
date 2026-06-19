/**
 * Client helper for the community API routes (publish / vote / comment).
 * Mirrors src/lib/api/debateClient.ts: errors surface as ProviderError with a
 * normalized code the UI maps to friendly copy.
 */

import type {
  AddCommentRequest,
  AddCommentResponse,
  ApiErrorBody,
  CastVoteRequest,
  CastVoteResponse,
  PublishMatchRequest,
  PublishMatchResponse,
  ReportContentRequest,
  ReportContentResponse,
} from "@/lib/api/contracts";
import type { DebateSession } from "@/lib/debate/debateTypes";
import type { PublishOptions, VoteChoice, VoteTally } from "@/lib/community/types";
import { ProviderError, type AppErrorCode } from "@/lib/utils/errors";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let code: AppErrorCode = "UNKNOWN_ERROR";
    let message = "";
    try {
      const data = (await res.json()) as ApiErrorBody;
      code = data.error?.code ?? code;
      message = data.error?.message ?? "";
    } catch {
      /* non-JSON error body */
    }
    throw new ProviderError(code, message);
  }
  return (await res.json()) as T;
}

export async function publishMatch(
  session: DebateSession,
  options: PublishOptions,
): Promise<PublishMatchResponse> {
  const body: PublishMatchRequest = { session, options };
  return postJson<PublishMatchResponse>("/api/community/publish", body);
}

export async function castVote(postId: string, choice: VoteChoice): Promise<VoteTally> {
  const body: CastVoteRequest = { postId, choice };
  const data = await postJson<CastVoteResponse>("/api/community/vote", body);
  return data.tally;
}

export async function addComment(
  postId: string,
  text: string,
): Promise<AddCommentResponse> {
  const body: AddCommentRequest = { postId, body: text };
  return postJson<AddCommentResponse>("/api/community/comment", body);
}

/** Flag a shared match (commentId omitted) or one of its comments for review. */
export async function reportContent(
  postId: string,
  reason: string,
  commentId?: string,
): Promise<void> {
  const body: ReportContentRequest = { postId, reason, commentId };
  await postJson<ReportContentResponse>("/api/community/report", body);
}
