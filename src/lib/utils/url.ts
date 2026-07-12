/**
 * URL scheme safety. Citation/source URLs originate from the open web (Brave
 * results, a fighter's native `:online` search) or from a client-submitted
 * session at publish time — all untrusted. Before any of them becomes an
 * `<a href>`, it must be confirmed to be plain http(s): React does NOT sanitize
 * `javascript:` / `data:` / `vbscript:` hrefs (it only warns in dev), so an
 * unchecked href is a stored, click-triggered script-injection vector on the
 * public community pages.
 */

/** True only for absolute http/https URLs — the sole schemes safe to link to. */
export function isSafeHttpUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Only allow a same-origin absolute path → blocks open-redirect abuse. */
export function safeNextPath(next: string | null | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

/**
 * Post-auth landing path for /auth/callback. Prefers an explicit ?next= (OAuth
 * and password-reset links). Branded auth emails can't embed the dynamic next
 * directly — Supabase templates only expose the whole redirect URL as
 * {{ .RedirectTo }} — so those links carry ?redirect_to=<original callback URL>
 * and the next is recovered from inside it. Both sources are untrusted URL
 * input, so the result always passes through safeNextPath.
 */
export function resolveAuthNext(searchParams: URLSearchParams): string {
  const direct = searchParams.get("next");
  if (direct) return safeNextPath(direct);
  const redirectTo = searchParams.get("redirect_to");
  if (redirectTo) {
    try {
      return safeNextPath(new URL(redirectTo).searchParams.get("next"));
    } catch {
      // not a parseable URL — treat as absent
    }
  }
  return "/";
}
