import { describe, expect, it } from "vitest";

import { isSafeHttpUrl } from "./url";

describe("isSafeHttpUrl", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(isSafeHttpUrl("https://example.com/a?b=1")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
    expect(isSafeHttpUrl("HTTPS://Example.com")).toBe(true);
  });

  it("rejects hostile and non-http schemes", () => {
    expect(isSafeHttpUrl("javascript:alert(document.cookie)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeHttpUrl("file:///etc/passwd")).toBe(false);
    // Leading whitespace/control chars are trimmed by the URL parser, so the
    // real scheme is still what's checked — no bypass.
    expect(isSafeHttpUrl("  javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("\tjavascript:alert(1)")).toBe(false);
  });

  it("rejects non-strings and unparseable input", () => {
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(42)).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
    expect(isSafeHttpUrl("/relative/path")).toBe(false);
  });
});
