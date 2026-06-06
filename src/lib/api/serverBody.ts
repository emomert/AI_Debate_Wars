/**
 * Shared request-body reader for the debate API routes (server-only).
 *
 * Two cheap guards before any expensive work:
 *  - rejects oversized bodies up front (Content-Length) so a crafted payload
 *    can't make the server build a giant prompt on the deployer's API key;
 *  - turns a malformed JSON body into a clean 400 INVALID_REQUEST instead of an
 *    opaque 502 UNKNOWN_ERROR.
 *
 * Content-Length can be absent (chunked) or spoofed, so this is a first line of
 * defense; the per-field caps in validators.ts bound the prompt that actually
 * reaches the model, and the platform body limit is the hard backstop.
 */

import "server-only";

import { ProviderError } from "@/lib/utils/errors";

// A full 7-round transcript (14 messages + usage/cost objects) is well under
// this; legitimate sessions never approach 1MB.
const MAX_BODY_BYTES = 1_000_000;

export async function readJsonBody<T>(req: Request): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) {
    throw new ProviderError("INVALID_REQUEST", "Request body too large");
  }
  try {
    return (await req.json()) as T;
  } catch {
    throw new ProviderError("INVALID_REQUEST", "Malformed JSON body");
  }
}
