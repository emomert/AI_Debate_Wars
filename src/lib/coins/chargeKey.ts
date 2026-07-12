/**
 * Coin-charge keys (docs/23_COINS.md). The coin ledger makes a charge idempotent
 * per (user, match_id) — so the key IS the anti-double-charge guard. It must be:
 *
 *   1. STABLE for the same logical charge (so retried turns / a re-sent verdict
 *      don't bill twice), and
 *   2. UNFORGEABLE by a client — otherwise a hostile caller who can invoke the
 *      coin_spend_match RPC directly (it's reachable over PostgREST) could
 *      pre-seed a ledger row under the exact key a real match will use, making
 *      the real charge return "ALREADY" and running the match for free.
 *
 * We get both by binding the key to an HMAC over the session id + amount + the
 * match/transcript content, computed with a server-only secret. The client can
 * see the `session:total` prefix but can never reproduce the tag, so it can
 * neither forge a real match's key (pre-seed) nor reuse one paid key across
 * DIFFERENT matches (replay — different content ⇒ different tag ⇒ fresh charge).
 */

import { createHmac } from "node:crypto";

// A delimiter that won't collide fields that ran together (an ASCII unit
// separator, vanishingly unlikely in topic/transcript text).
const SEP = String.fromCharCode(31);
const TAG_LEN = 24; // 96 bits of the HMAC-SHA256 hex digest — ample vs forgery.

/** Canonical fingerprint of the fields that DEFINE a match (stable across its
 *  turns; changes if a client re-points a session id at a different match). */
export function matchContentFingerprint(m: {
  topic: string;
  modelAId: string;
  modelBId: string;
  responseLength: string;
  deepDebate: boolean;
  roundCount: number;
}): string {
  return [
    m.topic,
    m.modelAId,
    m.modelBId,
    m.responseLength,
    m.deepDebate ? "deep" : "shallow",
    String(m.roundCount),
  ].join(SEP);
}

/** Canonical fingerprint of a transcript — stable once a match is complete, so
 *  re-judging the same transcript with the same judge is idempotent. */
export function transcriptFingerprint(
  messages: ReadonlyArray<{ speaker: string; content: string }>,
): string {
  return messages.map((x) => `${x.speaker}${SEP}${x.content}`).join(SEP);
}

function tag(secret: string, parts: string[]): string {
  return createHmac("sha256", secret).update(parts.join(SEP)).digest("hex").slice(0, TAG_LEN);
}

/** Charge key for a MATCH — `${sessionId}:${total}c:${hmac}`. */
export function matchChargeKey(
  secret: string,
  sessionId: string,
  total: number,
  fingerprint: string,
): string {
  return `${sessionId}:${total}c:${tag(secret, [sessionId, String(total), fingerprint])}`;
}

/** Charge key for a JUDGE verdict — bound to (session, judge, transcript). */
export function judgeChargeKey(
  secret: string,
  sessionId: string,
  judgeModelId: string,
  transcriptFp: string,
): string {
  return `${sessionId}:judge:${tag(secret, [sessionId, judgeModelId, transcriptFp])}`;
}
