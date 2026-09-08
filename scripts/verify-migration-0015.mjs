/**
 * Disposable verifier for migration 0015.
 *
 * Optional setup:
 *   npm install --prefix .remember/sql-check @electric-sql/pglite
 *
 * The script loads PGlite from .remember/sql-check so the repo root lockfile
 * and dependency graph stay untouched.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const migDir = join(repoRoot, "supabase", "migrations");
const pglitePath = join(
  repoRoot,
  ".remember",
  "sql-check",
  "node_modules",
  "@electric-sql",
  "pglite",
  "dist",
  "index.js",
);

let PGlite;
try {
  ({ PGlite } = await import(pathToFileURL(pglitePath).href));
} catch (error) {
  console.error(
    [
      "Missing disposable SQL runtime.",
      "Install it with:",
      "  npm install --prefix .remember/sql-check @electric-sql/pglite",
      `Expected module: ${pglitePath}`,
      error?.message ?? String(error),
    ].join("\n"),
  );
  process.exit(1);
}

const sql0003 = readFileSync(join(migDir, "0003_rate_limits.sql"), "utf8");
const sql0015 = readFileSync(join(migDir, "0015_generation_and_spend.sql"), "utf8");

const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000b2";
const SESSION_BUSY = "busy-session";
const SESSION_UNUSED = "unused-session";
const SESSION_ATTEMPTS = "attempts-session";

async function run(db, sql) {
  return db.exec(sql);
}

async function query(db, sql, params = []) {
  return db.query(sql, params);
}

async function setRole(db, role) {
  await run(db, `set role ${role};`);
}

async function resetRole(db) {
  await run(db, "reset role;");
}

async function setAuthUser(db, userId) {
  await query(db, "select set_config($1, $2, false)", ["request.jwt.claim.sub", userId]);
}

async function clearAuthUser(db) {
  await query(db, "select set_config($1, $2, false)", ["request.jwt.claim.sub", ""]);
}

async function withRole(db, role, fn) {
  await setRole(db, role);
  try {
    return await fn();
  } finally {
    await resetRole(db);
  }
}

async function expectDenied(db, role, statement, params = []) {
  await assert.rejects(
    async () =>
      withRole(db, role, async () => {
        await query(db, statement, params);
      }),
    /permission denied|insufficient privilege/i,
  );
}

async function setupDb(db) {
  await run(
    db,
    `
      create schema if not exists auth;
      do $$ begin create role anon; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role; exception when duplicate_object then null; end $$;
      create table if not exists auth.users (
        id uuid primary key
      );
      create or replace function auth.uid()
      returns uuid
      language sql
      stable
      as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
    `,
  );
  await run(db, sql0003);
  await run(db, sql0015);
}

async function insertFixtures(db) {
  await run(
    db,
    `
      insert into auth.users (id) values
        ('${USER_A}'),
        ('${USER_B}');

      insert into public.generation_matches (
        user_id, session_id, state, results, revision, attempts, active_key, lease_token, lease_until
      ) values
        ('${USER_A}', '${SESSION_BUSY}', '{"step":1}', '{}'::jsonb, 0, '{}'::jsonb, null, null, null),
        ('${USER_A}', '${SESSION_UNUSED}', '{"step":1}', '{}'::jsonb, 0, '{}'::jsonb, null, null, null),
        ('${USER_A}', '${SESSION_ATTEMPTS}', '{"step":1}', '{}'::jsonb, 0, '{}'::jsonb, null, null, null),
        ('${USER_B}', 'other-user-session', '{"step":1}', '{"turn:1":{"ok":true}}'::jsonb, 1, '{"turn:1":1}'::jsonb, null, null, null);
    `,
  );
}

async function serviceCall(db, userId, sql, params) {
  return withRole(db, "service_role", async () => {
    await setAuthUser(db, userId);
    try {
      return await query(db, sql, params);
    } finally {
      await clearAuthUser(db);
    }
  });
}

async function claim(db, userId, sessionId, revision, key, token) {
  const result = await serviceCall(
    db,
    userId,
    "select public.generation_claim($1, $2, $3, $4, $5) as result",
    [userId, sessionId, revision, key, token],
  );
  return result.rows[0]?.result;
}

async function finish(db, userId, sessionId, token, response, state, unused = false) {
  const result = await serviceCall(
    db,
    userId,
    "select public.generation_finish($1, $2, $3, $4, $5, $6) as ok",
    [userId, sessionId, token, response, state, unused],
  );
  return result.rows[0]?.ok;
}

async function querySingle(db, sql, params = []) {
  const result = await query(db, sql, params);
  return result.rows[0];
}

async function main() {
  const db = new PGlite();
  await db.waitReady;
  try {
    await setupDb(db);
    await insertFixtures(db);

    await expectDenied(db, "anon", "select public.generation_claim($1, $2, $3, $4, $5)", [
      USER_A,
      SESSION_BUSY,
      0,
      "turn:1",
      "11111111-1111-1111-1111-111111111111",
    ]);
    await expectDenied(db, "authenticated", "select public.spend_reserve($1, $2, $3, $4, $5)", [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "1.1.1.1",
      0.5,
      1,
      1,
    ]);

    const reserveOk = await serviceCall(db, USER_A, "select public.spend_reserve($1, $2, $3, $4, $5) as ok", [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "1.1.1.1",
      0.6,
      1,
      0.7,
    ]);
    assert.equal(reserveOk.rows[0]?.ok, true);

    const globalCapBlocked = await serviceCall(
      db,
      USER_A,
      "select public.spend_reserve($1, $2, $3, $4, $5) as ok",
      ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "2.2.2.2", 0.5, 1, 0.7],
    );
    assert.equal(globalCapBlocked.rows[0]?.ok, false);

    const ipCapBlocked = await serviceCall(
      db,
      USER_A,
      "select public.spend_reserve($1, $2, $3, $4, $5) as ok",
      ["cccccccc-cccc-cccc-cccc-cccccccccccc", "1.1.1.1", 0.2, 1, 0.7],
    );
    assert.equal(ipCapBlocked.rows[0]?.ok, false);

    const invalidSettle = await serviceCall(
      db,
      USER_A,
      "select public.spend_reserve($1, $2, $3, $4, $5) as ok",
      ["dddddddd-dddd-dddd-dddd-dddddddddddd", "3.3.3.3", 0.25, 1, 1],
    );
    assert.equal(invalidSettle.rows[0]?.ok, true);
    await assert.rejects(
      async () => {
        await serviceCall(db, USER_A, "select public.spend_settle($1, $2)", [
          "dddddddd-dddd-dddd-dddd-dddddddddddd",
          -1,
        ]);
      },
      /invalid cost/i,
    );

    const unsettled = await querySingle(
      db,
      "select settled, amount from public.spend_reservations where id = $1",
      ["dddddddd-dddd-dddd-dddd-dddddddddddd"],
    );
    assert.equal(unsettled?.settled, false);
    assert.equal(Number(unsettled?.amount), 0.25);

    const settle1 = await serviceCall(db, USER_A, "select public.spend_settle($1, $2) as ok", [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      0.4,
    ]);
    assert.equal(settle1.rows[0]?.ok, true);

    const settle2 = await serviceCall(db, USER_A, "select public.spend_settle($1, $2) as ok", [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      0.4,
    ]);
    assert.equal(settle2.rows[0]?.ok, true);

    const ledger = await query(db, "select scope, spent_usd from public.spend_ledger order by scope");
    assert.equal(ledger.rows.find((row) => row.scope === "global")?.spent_usd, "0.650000");
    assert.equal(ledger.rows.find((row) => row.scope === "ip:1.1.1.1")?.spent_usd, "0.400000");
    assert.equal(ledger.rows.find((row) => row.scope === "ip:3.3.3.3")?.spent_usd, "0.250000");

    const busyToken1 = "11111111-1111-1111-1111-111111111111";
    const busyToken2 = "22222222-2222-2222-2222-222222222222";
    const busyToken3 = "33333333-3333-3333-3333-333333333333";

    assert.equal(await claim(db, USER_A, SESSION_BUSY, 0, "turn:1", busyToken1), "claimed");
    assert.equal(await claim(db, USER_A, SESSION_BUSY, 0, "turn:1", busyToken2), "busy");

    await query(
      db,
      "update public.generation_matches set lease_until = now() - interval '1 second' where user_id = $1 and session_id = $2",
      [USER_A, SESSION_BUSY],
    );

    assert.equal(await claim(db, USER_A, SESSION_BUSY, 0, "turn:1", busyToken2), "claimed");
    assert.equal(
      await finish(db, USER_A, SESSION_BUSY, busyToken1, '{"turn":"old"}', '{"step":2}', false),
      false,
    );
    assert.equal(
      await finish(db, USER_A, SESSION_BUSY, busyToken2, '{"turn":"new"}', '{"step":3}', false),
      true,
    );
    assert.equal(await claim(db, USER_A, SESSION_BUSY, 0, "turn:1", busyToken3), "stale");

    assert.equal(
      await claim(db, USER_A, SESSION_UNUSED, 0, "turn:unused", "44444444-4444-4444-4444-444444444444"),
      "claimed",
    );
    assert.equal(
      await finish(
        db,
        USER_A,
        SESSION_UNUSED,
        "44444444-4444-4444-4444-444444444444",
        null,
        null,
        true,
      ),
      true,
    );

    const unusedAttempts = await querySingle(
      db,
      "select attempts from public.generation_matches where user_id = $1 and session_id = $2",
      [USER_A, SESSION_UNUSED],
    );
    assert.equal(Number(unusedAttempts?.attempts?.["turn:unused"] ?? NaN), 0);

    for (let i = 0; i < 3; i += 1) {
      const claimResult = await claim(
        db,
        USER_A,
        SESSION_ATTEMPTS,
        0,
        "turn:budget",
        `55555555-5555-5555-5555-55555555555${i}`,
      );
      assert.equal(claimResult, "claimed");
      await query(
        db,
        "update public.generation_matches set lease_until = now() - interval '1 second' where user_id = $1 and session_id = $2",
        [USER_A, SESSION_ATTEMPTS],
      );
    }

    assert.equal(
      await claim(db, USER_A, SESSION_ATTEMPTS, 0, "turn:budget", "55555555-5555-5555-5555-555555555559"),
      "exhausted",
    );

    const exportRows = await withRole(db, "authenticated", async () => {
      await setAuthUser(db, USER_A);
      try {
        return await query(db, "select * from public.generation_export()");
      } finally {
        await clearAuthUser(db);
      }
    });
    assert.equal(exportRows.rows.length, 3);
    assert.deepEqual(Object.keys(exportRows.rows[0] ?? {}).sort(), [
      "attempts",
      "created_at",
      "results",
      "revision",
      "session_id",
      "state",
      "updated_at",
    ]);
    assert.ok(exportRows.rows.every((row) => row.session_id !== "other-user-session"));

    const exportOther = await withRole(db, "authenticated", async () => {
      await setAuthUser(db, USER_B);
      try {
        return await query(db, "select * from public.generation_export()");
      } finally {
        await clearAuthUser(db);
      }
    });
    assert.equal(exportOther.rows.length, 1);
    assert.equal(exportOther.rows[0]?.session_id, "other-user-session");

    await expectDenied(db, "anon", "select * from public.generation_export()");

    console.log("0015 migration integration verification passed.");
  } finally {
    await db.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("0015 migration integration verification failed:");
    console.error(error?.stack ?? error?.message ?? String(error));
    process.exit(1);
  });
}
