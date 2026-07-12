import "server-only";

/**
 * Admin gating. There is no admin role in the DB — the owner is identified by an
 * env allowlist of Supabase user ids (ADMIN_USER_IDS, comma-separated). Simple,
 * leak-proof (no shared password), and there's an audit trail (each admin action
 * is tied to a real signed-in account). Read fresh each call so changing the env
 * needs no rebuild of module state.
 */
export function adminUserIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isAdminUserId(id: string | null | undefined): boolean {
  return Boolean(id) && adminUserIds().has(id as string);
}
