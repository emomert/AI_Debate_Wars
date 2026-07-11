import { afterEach, describe, expect, it, vi } from "vitest";

import { isAdminUserId } from "./access";

afterEach(() => vi.unstubAllEnvs());

describe("isAdminUserId", () => {
  it("matches an id in the comma-separated allowlist (trimmed)", () => {
    vi.stubEnv("ADMIN_USER_IDS", "aaa-111, bbb-222 ,ccc-333");
    expect(isAdminUserId("bbb-222")).toBe(true);
    expect(isAdminUserId("ccc-333")).toBe(true);
  });

  it("rejects ids not in the list, and null/empty/undefined", () => {
    vi.stubEnv("ADMIN_USER_IDS", "aaa-111");
    expect(isAdminUserId("zzz-999")).toBe(false);
    expect(isAdminUserId(null)).toBe(false);
    expect(isAdminUserId(undefined)).toBe(false);
    expect(isAdminUserId("")).toBe(false);
  });

  it("treats an unset/empty allowlist as no admins", () => {
    vi.stubEnv("ADMIN_USER_IDS", "");
    expect(isAdminUserId("aaa-111")).toBe(false);
  });
});
