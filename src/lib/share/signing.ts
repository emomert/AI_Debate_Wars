/**
 * Share-link verdict signing (audit critical #2).
 *
 * The `?d=` share payload is unauthenticated, so anyone can craft a link that
 * asserts a fabricated "Debator judge" result. We bind genuine verdicts to an
 * HMAC over their displayed fields, computed server-side at verdict-generation
 * time with a secret the client never sees. /s and /api/og recompute the HMAC
 * from the decoded payload and compare: match → verified, otherwise unverified.
 *
 * Dormant until SHARE_SECRET is set (shareSigningEnabled() === false): nothing is
 * signed and nothing is marked unverified, so genuine shares never look broken
 * before the secret is provisioned. Uses Web Crypto so it works in the Node
 * routes (verdict, /s) and the Edge OG route alike.
 */

import { shareCanonical, type SharePayload } from "@/lib/share/shareLink";

const SECRET = process.env.SHARE_SECRET;
const encoder = new TextEncoder();

/** True when a server secret is configured, so signing + verification are live. */
export function shareSigningEnabled(): boolean {
  return Boolean(SECRET);
}

async function hmac(canonical: string): Promise<string | null> {
  if (!SECRET) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(canonical));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // base64url, truncated — keeps the share URL short while staying infeasible to forge.
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 22);
}

/** Sign a share payload's canonical fields; null when signing is disabled. */
export function signSharePayload(p: SharePayload): Promise<string | null> {
  return hmac(shareCanonical(p));
}

/** True only when the payload carries a valid signature for its own fields. */
export async function verifySharePayload(p: SharePayload): Promise<boolean> {
  if (!SECRET || !p.g) return false;
  const expected = await hmac(shareCanonical(p));
  if (!expected || expected.length !== p.g.length) return false;
  // Constant-time-ish compare (avoid early-exit timing leak).
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ p.g.charCodeAt(i);
  }
  return diff === 0;
}
