/**
 * Stateless share links (the auto-unfurling preview). The verdict essentials are
 * encoded into the URL (base64url JSON) — no DB row, no auth — so anyone can
 * share, and the private `matches` table is never exposed to anonymous crawlers.
 *
 * Pure + isomorphic: uses TextEncoder/atob/btoa, available in the browser, in
 * server components, and in the edge OG route.
 */

import type { DebateSession } from "@/lib/debate/debateTypes";

/** Compact keys keep the URL short. Only public, non-sensitive verdict data. */
export interface SharePayload {
  t: string; // topic
  a: string; // model A display name
  b: string; // model B display name
  w?: string; // winner: "modelA" | "modelB" | "tie" | "not_applicable"
  sa?: number; // score A
  sb?: number; // score B
  wa?: string; // winning argument
  s?: string; // reasoning (bold markers stripped)
}

function clamp(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeSharePayload(p: SharePayload): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(p)));
}

// The ?d param is fully attacker-controlled and unauthenticated, so bound it:
// a legit payload is ~500 chars and strictly base64url. Reject anything else
// before atob/JSON.parse (cheap DoS guard + blocks junk reaching the renderers).
const MAX_CODE_LEN = 4000;
export function isValidShareCode(s: string): boolean {
  return s.length > 0 && s.length <= MAX_CODE_LEN && /^[A-Za-z0-9_-]+$/.test(s);
}

const WINNERS = new Set(["modelA", "modelB", "tie", "not_applicable"]);
const optStr = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const optNum = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export function decodeSharePayload(s: string): SharePayload | null {
  if (!isValidShareCode(s)) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(s));
    const raw = JSON.parse(json) as Record<string, unknown>;
    if (!raw || typeof raw !== "object" || typeof raw.t !== "string") return null;
    // Normalize EVERY field to a safe primitive — ?d is attacker-controlled, and
    // an object/array sneaking into a field would otherwise be rendered as a
    // React child (crash) by the OG image / share page. Build a clean object.
    return {
      t: raw.t,
      a: optStr(raw.a) ?? "Model A",
      b: optStr(raw.b) ?? "Model B",
      w: typeof raw.w === "string" && WINNERS.has(raw.w) ? raw.w : undefined,
      sa: optNum(raw.sa),
      sb: optNum(raw.sb),
      wa: optStr(raw.wa),
      s: optStr(raw.s),
    };
  } catch {
    return null;
  }
}

/** Build the (length-bounded) share payload from a finished session. */
export function sharePayloadFromSession(session: DebateSession): SharePayload {
  const v = session.verdict;
  return {
    t: clamp(session.topic, 140),
    a: clamp(session.modelA.displayName, 40),
    b: clamp(session.modelB.displayName, 40),
    w: v?.winner,
    sa: v?.scoreModelA,
    sb: v?.scoreModelB,
    wa: v?.winnerArgument ? clamp(v.winnerArgument, 180) : undefined,
    s: v?.summary ? clamp(v.summary.replace(/\*\*/g, ""), 300) : undefined,
  };
}

/** Winner headline used by the share page + OG image. */
export function shareHeadline(p: SharePayload): string {
  if (p.w === "modelA") return `${p.a} takes it`;
  if (p.w === "modelB") return `${p.b} takes it`;
  if (p.w === "tie") return "It's a draw";
  return `${p.a} vs ${p.b}`;
}
