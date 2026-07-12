import { describe, expect, it } from "vitest";

import { isSafeHttpUrl, resolveAuthNext, safeNextPath } from "./url";

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

describe("safeNextPath", () => {
  it("keeps same-origin absolute paths", () => {
    expect(safeNextPath("/m/abc")).toBe("/m/abc");
    expect(safeNextPath("/reset-password?step=2")).toBe("/reset-password?step=2");
  });

  it("falls back to / for missing or empty input", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("blocks open-redirect shapes", () => {
    expect(safeNextPath("//evil.com/phish")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });
});

describe("resolveAuthNext", () => {
  const paramsOf = (url: string) => new URL(url).searchParams;

  it("prefers an explicit next param", () => {
    expect(
      resolveAuthNext(paramsOf("https://debator.xyz/auth/callback?code=x&next=%2Fm%2Fabc")),
    ).toBe("/m/abc");
  });

  it("recovers next from the redirect_to URL carried by branded email links", () => {
    // Exactly what GoTrue interpolates for {{ .RedirectTo }} — unencoded, with
    // its own ?next= query inside.
    expect(
      resolveAuthNext(
        paramsOf(
          "https://debator.xyz/auth/callback?token_hash=abc&type=email&redirect_to=https://debator.xyz/auth/callback?next=%2Fm%2Fabc",
        ),
      ),
    ).toBe("/m/abc");
  });

  it("falls back to / when redirect_to has no next or is not a URL", () => {
    expect(
      resolveAuthNext(
        paramsOf(
          "https://debator.xyz/auth/callback?token_hash=abc&type=email&redirect_to=https://debator.xyz/auth/callback",
        ),
      ),
    ).toBe("/");
    expect(
      resolveAuthNext(
        paramsOf("https://debator.xyz/auth/callback?token_hash=abc&type=email&redirect_to=garbage"),
      ),
    ).toBe("/");
    expect(resolveAuthNext(paramsOf("https://debator.xyz/auth/callback?token_hash=abc"))).toBe("/");
  });

  it("sanitizes hostile next values from either source", () => {
    expect(
      resolveAuthNext(paramsOf("https://debator.xyz/auth/callback?next=https%3A%2F%2Fevil.com")),
    ).toBe("/");
    expect(
      resolveAuthNext(
        paramsOf(
          "https://debator.xyz/auth/callback?redirect_to=https://evil.com/auth/callback?next=%2F%2Fevil.com",
        ),
      ),
    ).toBe("/");
  });
});
