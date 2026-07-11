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
