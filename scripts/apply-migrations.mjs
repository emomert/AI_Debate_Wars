/**
 * Debator — apply SQL migrations over the direct Postgres connection.
 *
 * Uses SUPABASE_DB_URL (out-of-band admin connection; never shipped to the
 * client). The runner now keeps a checksum ledger in the database, applies only
 * migrations that are still pending, and refuses to replay a migrated schema
 * without an explicit baseline.
 *
 * Usage:
 *   node scripts/apply-migrations.mjs
 *   node scripts/apply-migrations.mjs --status
 *   node scripts/apply-migrations.mjs --dry-run
 *   node scripts/apply-migrations.mjs 0015_generation_and_spend.sql
 *   node scripts/apply-migrations.mjs --baseline-through 0014 --dry-run
 *   node scripts/apply-migrations.mjs --baseline-through 0014
 */

import process from "node:process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

export const MIGRATION_LEDGER_TABLE = "public.schema_migrations";
export const MIGRATION_LOCK_KEY = [20260908, 15];
export const MIGRATION_PROBES = [
  "public.matches",
  "public.profiles",
  "public.shared_matches",
  "public.shared_match_comments",
  "public.shared_match_votes",
  "public.profile_consent",
  "public.api_errors",
  "public.coin_ledger",
  "public.coin_daily_claims",
  "public.coin_status()",
  "public.coin_spend_match(text, integer, integer, integer)",
  "public.coin_claim_daily()",
  "public.rl_hit(text, integer, integer)",
  "public.spend_allowed(text, numeric, numeric)",
  "public.spend_record(text, numeric)",
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const migDir = join(repoRoot, "supabase", "migrations");

function migrationSortKey(version) {
  return Number.parseInt(version, 10);
}

export function checksumSql(sql) {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n").replace(/\r/g, "\n")).digest("hex");
}

export function migrationVersionFromFilename(filename) {
  const match = filename.match(/^(\d{4})_[^\\/]+\.sql$/);
  if (!match) {
    throw new Error(`Invalid migration filename: ${filename}`);
  }
  return match[1];
}

export function normalizeMigrationRef(ref) {
  return ref.replace(/\\/g, "/").split("/").pop() ?? ref;
}

export function resolveMigrationRef(ref, migrations) {
  const normalized = normalizeMigrationRef(ref);
  const byVersion = migrations.find((migration) => migration.version === normalized);
  if (byVersion) return byVersion;
  const byFilename = migrations.find((migration) => migration.filename === normalized);
  if (byFilename) return byFilename;
  const byPath = migrations.find(
    (migration) => migration.path === ref || migration.path.endsWith(`/${normalized}`),
  );
  if (byPath) return byPath;
  throw new Error(`Unknown migration reference: ${ref}`);
}

export function selectMigrations(migrations, refs) {
  if (!refs.length) return [...migrations];
  const seen = new Set();
  const selected = [];
  for (const ref of refs) {
    const migration = resolveMigrationRef(ref, migrations);
    if (seen.has(migration.version)) continue;
    seen.add(migration.version);
    selected.push(migration);
  }
  selected.sort((a, b) => migrationSortKey(a.version) - migrationSortKey(b.version));
  return selected;
}

export function buildPlan({
  migrations,
  refs,
  appliedVersions,
  hasLedgerRows,
  hasTrackedObjects,
  statusOnly,
  dryRun,
  baselineThrough,
}) {
  const allMigrations = [...migrations].sort(
    (a, b) => migrationSortKey(a.version) - migrationSortKey(b.version),
  );
  const requested = selectMigrations(allMigrations, refs);
  const targetMap = new Set(requested.map((migration) => migration.version));
  const applied = new Set(appliedVersions);

  if (baselineThrough) {
    if (refs.length) {
      throw new Error("Baseline mode does not accept positional migration arguments.");
    }
    if (hasLedgerRows) {
      throw new Error("Baseline mode requires an empty migration ledger.");
    }
    const cutoffIndex = allMigrations.findIndex((migration) => migration.version === baselineThrough);
    if (cutoffIndex < 0) {
      throw new Error(`Unknown baseline target: ${baselineThrough}`);
    }
    const baselineMigrations = allMigrations.slice(0, cutoffIndex + 1);
    return {
      mode: "baseline",
      dryRun,
      migrations: baselineMigrations,
      appliedMigrations: [],
      pendingMigrations: baselineMigrations,
      requiresBaseline: false,
      hasTrackedObjects,
    };
  }

  if (statusOnly) {
    return {
      mode: "status",
      dryRun: true,
      migrations: requested,
      appliedMigrations: requested.filter((migration) => applied.has(migration.version)),
      pendingMigrations: requested.filter((migration) => !applied.has(migration.version)),
      requiresBaseline: !hasLedgerRows && hasTrackedObjects,
      hasTrackedObjects,
    };
  }

  if (!hasLedgerRows && hasTrackedObjects) {
    throw new Error(
      "Existing schema detected without a migration ledger. Baseline it explicitly with --baseline-through <version>.",
    );
  }

  if (refs.length) {
    const highestIndex = Math.max(
      ...requested.map((migration) =>
        allMigrations.findIndex((candidate) => candidate.version === migration.version),
      ),
    );
    for (let index = 0; index <= highestIndex; index += 1) {
      const migration = allMigrations[index];
      const alreadyApplied = applied.has(migration.version);
      const explicitlyRequested = targetMap.has(migration.version);
      if (!alreadyApplied && !explicitlyRequested) {
        throw new Error(
          `Requested migrations skip pending ${migration.filename}. Apply the pending chain or baseline first.`,
        );
      }
    }
  }

  const pendingMigrations = requested.filter((migration) => !applied.has(migration.version));
  const appliedMigrations = requested.filter((migration) => applied.has(migration.version));

  return {
    mode: "apply",
    dryRun,
    migrations: requested,
    appliedMigrations,
    pendingMigrations,
    requiresBaseline: false,
    hasTrackedObjects,
  };
}

function formatMigrationList(migrations) {
  if (!migrations.length) return "(none)";
  return migrations.map((migration) => migration.filename).join(", ");
}

function migrationDrift(current, recorded) {
  return current.filename !== recorded.filename || current.checksum !== recorded.checksum;
}

async function readConnectionString() {
  let conn = process.env.SUPABASE_DB_URL;
  if (!conn) {
    try {
      const env = readFileSync(join(repoRoot, ".env.local"), "utf8");
      const match = env.match(/^\s*SUPABASE_DB_URL\s*=\s*(.+)$/m);
      if (match) conn = match[1].trim().replace(/^["']|["']$/g, "");
    } catch {
      /* no .env.local */
    }
  }
  return conn;
}

async function loadPgClient() {
  try {
    const { Client } = await import("pg");
    return Client;
  } catch {
    console.error("The 'pg' package is not installed. Run `npm install` first.");
    process.exit(1);
  }
}

async function loadAvailableMigrations() {
  const files = readdirSync(migDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  return files.map((filename) => {
    const path = join(migDir, filename);
    const sql = readFileSync(path, "utf8");
    const version = migrationVersionFromFilename(filename);
    return {
      version,
      filename,
      path,
      sql,
      checksum: checksumSql(sql),
    };
  });
}

async function ensureLedgerTable(client) {
  await client.query(`
    create table if not exists ${MIGRATION_LEDGER_TABLE} (
      version     text primary key,
      filename    text not null,
      checksum    text not null,
      applied_at  timestamptz not null default now()
    )
  `);
}

async function loadLedgerRows(client) {
  const tableCheck = await client.query(`
    select to_regclass($1) is not null as exists
  `, [MIGRATION_LEDGER_TABLE]);
  if (!tableCheck.rows[0]?.exists) {
    return { tableExists: false, rows: [] };
  }
  const result = await client.query(`
    select version, filename, checksum, applied_at
      from ${MIGRATION_LEDGER_TABLE}
      order by version
  `);
  return { tableExists: true, rows: result.rows };
}

async function hasTrackedApplicationObjects(client) {
  const result = await client.query(`
    select
      to_regclass('public.matches') is not null
      or to_regclass('public.profiles') is not null
      or to_regclass('public.shared_matches') is not null
      or to_regclass('public.shared_match_comments') is not null
      or to_regclass('public.shared_match_votes') is not null
      or to_regclass('public.profile_consent') is not null
      or to_regclass('public.api_errors') is not null
      or to_regclass('public.coin_ledger') is not null
      or to_regclass('public.coin_daily_claims') is not null
      or to_regprocedure('public.coin_status()') is not null
      or to_regprocedure('public.coin_spend_match(text, integer, integer, integer)') is not null
      or to_regprocedure('public.coin_claim_daily()') is not null
      or to_regprocedure('public.rl_hit(text, integer, integer)') is not null
      or to_regprocedure('public.spend_allowed(text, numeric, numeric)') is not null
      or to_regprocedure('public.spend_record(text, numeric)') is not null as has_objects
  `);
  return Boolean(result.rows[0]?.has_objects);
}

async function validateBaseline(client, targetVersion) {
  const result = await client.query(`
    select
      to_regclass('public.matches') is not null as matches_table,
      to_regclass('public.profiles') is not null as profiles_table,
      to_regclass('public.shared_matches') is not null as shared_matches_table,
      to_regclass('public.coin_ledger') is not null as coin_ledger_table,
      to_regclass('public.coin_daily_claims') is not null as coin_daily_claims_table,
      to_regclass('public.api_errors') is not null as api_errors_table,
      exists (
        select 1
          from pg_policies
         where schemaname = 'public'
           and tablename = 'coin_ledger'
           and policyname = 'coin_ledger_select_own'
      ) as coin_ledger_policy,
      exists (
        select 1
          from pg_policies
         where schemaname = 'public'
           and tablename = 'coin_daily_claims'
           and policyname = 'coin_daily_claims_select_own'
      ) as coin_daily_claims_policy,
      coalesce(pg_get_function_result('public.coin_status()'::regprocedure), '') like '%claimed_today%' as coin_status_shape,
      position('auth.uid()' in coalesce(pg_get_functiondef('public.coin_status()'::regprocedure), '')) > 0 as coin_status_source_guard,
      has_function_privilege('authenticated', 'public.coin_status()'::regprocedure, 'EXECUTE') as coin_status_auth,
      position('auth.uid()' in coalesce(pg_get_functiondef('public.coin_spend_match(text, integer, integer, integer)'::regprocedure), '')) > 0 as coin_spend_match_source_guard,
      has_function_privilege('authenticated', 'public.coin_spend_match(text, integer, integer, integer)'::regprocedure, 'EXECUTE') as coin_spend_match_auth,
      position('auth.uid()' in coalesce(pg_get_functiondef('public.coin_redeem_promo(text)'::regprocedure), '')) > 0 as coin_redeem_promo_source_guard,
      has_function_privilege('authenticated', 'public.coin_redeem_promo(text)'::regprocedure, 'EXECUTE') as coin_redeem_promo_auth,
      position('auth.uid()' in coalesce(pg_get_functiondef('public.coin_claim_daily()'::regprocedure), '')) > 0 as coin_claim_daily_source_guard,
      has_function_privilege('authenticated', 'public.coin_claim_daily()'::regprocedure, 'EXECUTE') as coin_claim_daily_auth,
      not has_function_privilege('anon', 'public.coin_claim_daily()'::regprocedure, 'EXECUTE') as coin_claim_daily_anon_blocked,
      has_function_privilege('service_role', 'public.rl_hit(text, integer, integer)'::regprocedure, 'EXECUTE') as rl_hit_service,
      not has_function_privilege('anon', 'public.rl_hit(text, integer, integer)'::regprocedure, 'EXECUTE') as rl_hit_anon_blocked,
      not has_function_privilege('authenticated', 'public.rl_hit(text, integer, integer)'::regprocedure, 'EXECUTE') as rl_hit_auth_blocked,
      has_function_privilege('service_role', 'public.spend_allowed(text, numeric, numeric)'::regprocedure, 'EXECUTE') as spend_allowed_service,
      not has_function_privilege('anon', 'public.spend_allowed(text, numeric, numeric)'::regprocedure, 'EXECUTE') as spend_allowed_anon_blocked,
      not has_function_privilege('authenticated', 'public.spend_allowed(text, numeric, numeric)'::regprocedure, 'EXECUTE') as spend_allowed_auth_blocked,
      has_function_privilege('service_role', 'public.spend_record(text, numeric)'::regprocedure, 'EXECUTE') as spend_record_service,
      not has_function_privilege('anon', 'public.spend_record(text, numeric)'::regprocedure, 'EXECUTE') as spend_record_anon_blocked,
      not has_function_privilege('authenticated', 'public.spend_record(text, numeric)'::regprocedure, 'EXECUTE') as spend_record_auth_blocked
  `);
  const row = result.rows[0] ?? {};
  const failures = [];
  const requireTrue = (key, label) => {
    if (!row[key]) failures.push(label);
  };

  requireTrue("matches_table", "public.matches table");
  requireTrue("profiles_table", "public.profiles table");
  requireTrue("shared_matches_table", "public.shared_matches table");
  requireTrue("coin_ledger_table", "public.coin_ledger table");
  requireTrue("coin_daily_claims_table", "public.coin_daily_claims table");
  requireTrue("api_errors_table", "public.api_errors table");
  requireTrue("coin_ledger_policy", "coin_ledger_select_own policy");
  requireTrue("coin_daily_claims_policy", "coin_daily_claims_select_own policy");
  requireTrue("coin_status_shape", "coin_status() returning claimed_today");
  requireTrue("coin_status_source_guard", "coin_status() auth.uid() guard in source");
  requireTrue("coin_status_auth", "coin_status() authenticated EXECUTE");
  requireTrue("coin_spend_match_source_guard", "coin_spend_match() auth.uid() guard in source");
  requireTrue("coin_spend_match_auth", "coin_spend_match() authenticated EXECUTE");
  requireTrue("coin_redeem_promo_source_guard", "coin_redeem_promo() auth.uid() guard in source");
  requireTrue("coin_redeem_promo_auth", "coin_redeem_promo() authenticated EXECUTE");
  requireTrue("coin_claim_daily_source_guard", "coin_claim_daily() auth.uid() guard in source");
  requireTrue("coin_claim_daily_auth", "coin_claim_daily() authenticated EXECUTE");
  requireTrue("coin_claim_daily_anon_blocked", "coin_claim_daily() blocked from anon");
  requireTrue("rl_hit_service", "rl_hit() granted to service_role");
  requireTrue("rl_hit_anon_blocked", "rl_hit() blocked from anon");
  requireTrue("rl_hit_auth_blocked", "rl_hit() blocked from authenticated");
  requireTrue("spend_allowed_service", "spend_allowed() granted to service_role");
  requireTrue("spend_allowed_anon_blocked", "spend_allowed() blocked from anon");
  requireTrue("spend_allowed_auth_blocked", "spend_allowed() blocked from authenticated");
  requireTrue("spend_record_service", "spend_record() granted to service_role");
  requireTrue("spend_record_anon_blocked", "spend_record() blocked from anon");
  requireTrue("spend_record_auth_blocked", "spend_record() blocked from authenticated");

  if (failures.length) {
    throw new Error(
      `Baseline through ${targetVersion} rejected: the current database does not match the known 0001-0014 schema/grant set.\n- ${failures.join(
        "\n- ",
      )}`,
    );
  }
}

function printStatusReport({ hasLedgerRows, ledgerTableExists, hasTrackedObjects, plan, rows, migrations }) {
  console.log("Migration status:");
  console.log(`  ledger table: ${ledgerTableExists ? "present" : "missing"}`);
  console.log(`  ledger rows: ${hasLedgerRows ? rows.length : 0}`);
  console.log(`  tracked schema: ${hasTrackedObjects ? "present" : "not detected"}`);
  console.log(`  selected: ${formatMigrationList(migrations)}`);
  console.log(`  applied: ${formatMigrationList(plan.appliedMigrations)}`);
  console.log(`  pending: ${formatMigrationList(plan.pendingMigrations)}`);
  if (!hasLedgerRows && hasTrackedObjects) {
    console.log("  action: baseline required before replaying SQL");
  } else if (!hasLedgerRows) {
    console.log("  action: fresh database; ready for an initial apply");
  } else if (!plan.pendingMigrations.length) {
    console.log("  action: up to date");
  }
}

async function main() {
  const conn = await readConnectionString();
  if (!conn) {
    console.error("SUPABASE_DB_URL is not set (env or .env.local).");
    process.exit(1);
  }

  const Client = await loadPgClient();
  const args = process.argv.slice(2);
  const flags = {
    status: false,
    dryRun: false,
    baselineThrough: null,
  };
  const refs = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--status") {
      flags.status = true;
      continue;
    }
    if (arg === "--dry-run") {
      flags.dryRun = true;
      continue;
    }
    if (arg === "--baseline-through") {
      index += 1;
      const target = args[index];
      if (!target) {
        throw new Error("--baseline-through requires a version such as 0014.");
      }
      flags.baselineThrough = target;
      continue;
    }
    if (arg.startsWith("--baseline-through=")) {
      const target = arg.split("=", 2)[1];
      if (!target) {
        throw new Error("--baseline-through requires a version such as 0014.");
      }
      flags.baselineThrough = target;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage:",
          "  node scripts/apply-migrations.mjs",
          "  node scripts/apply-migrations.mjs --status",
          "  node scripts/apply-migrations.mjs --dry-run",
          "  node scripts/apply-migrations.mjs 0015_generation_and_spend.sql",
          "  node scripts/apply-migrations.mjs --baseline-through 0014",
          "",
          "The runner tracks applied versions and checksums in public.schema_migrations.",
          "Use --baseline-through only for an already-populated schema that matches the reviewed migration set.",
        ].join("\n"),
      );
      return;
    }
    refs.push(arg);
  }

  const allMigrations = await loadAvailableMigrations();

  let connectionString = conn;
  if (!/sslmode=/.test(connectionString)) {
    connectionString += (connectionString.includes("?") ? "&" : "?") + "uselibpqcompat=true&sslmode=require";
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to the database.");

  const mutatingRun = !flags.status && !flags.dryRun;
  if (mutatingRun) {
    await client.query("select pg_advisory_lock($1, $2)", MIGRATION_LOCK_KEY);
  }

  try {
    const { tableExists, rows } = await loadLedgerRows(client);
    const hasLedgerRows = rows.length > 0;
    const appliedVersions = rows.map((row) => row.version);
    const currentMigrations = new Map(allMigrations.map((migration) => [migration.version, migration]));
    const drifted = rows.filter((row) => {
      const current = currentMigrations.get(row.version);
      return current ? migrationDrift(current, row) : true;
    });
    const hasTrackedObjects = await hasTrackedApplicationObjects(client);
    const plan = buildPlan({
      migrations: allMigrations,
      refs,
      appliedVersions,
      hasLedgerRows,
      hasTrackedObjects,
      statusOnly: flags.status,
      dryRun: flags.dryRun,
      baselineThrough: flags.baselineThrough,
    });

    if (drifted.length) {
      const driftNames = drifted.map((row) => `${row.version} (${row.filename})`).join(", ");
      throw new Error(`Migration ledger drift detected: ${driftNames}. Refusing to continue until the edited files are reconciled.`);
    }

    if (flags.status) {
      printStatusReport({
        hasLedgerRows,
        ledgerTableExists: tableExists,
        hasTrackedObjects,
        plan,
        rows,
        migrations: allMigrations,
      });
      return;
    }

    if (plan.mode === "baseline") {
      await validateBaseline(client, flags.baselineThrough);
      if (flags.dryRun) {
        console.log(`Would baseline ${plan.migrations.length} migration(s) through ${flags.baselineThrough}.`);
        console.log(`  ${formatMigrationList(plan.migrations)}`);
        return;
      }

      await client.query("begin");
      try {
        await ensureLedgerTable(client);
        for (const migration of plan.migrations) {
          await client.query(
            `insert into ${MIGRATION_LEDGER_TABLE} (version, filename, checksum) values ($1, $2, $3)`,
            [migration.version, migration.filename, migration.checksum],
          );
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      }

      console.log(`Baselined ${plan.migrations.length} migration(s) through ${flags.baselineThrough}.`);
      return;
    }

    if (flags.dryRun) {
      if (!plan.pendingMigrations.length) {
        console.log("No pending migrations.");
      } else {
        console.log(`Would apply ${plan.pendingMigrations.length} pending migration(s):`);
        for (const migration of plan.pendingMigrations) {
          console.log(`  ✓ ${migration.filename}`);
        }
      }
      return;
    }

    if (!hasLedgerRows && !hasTrackedObjects) {
      console.log("Fresh database detected; creating the migration ledger and applying all reviewed migrations.");
    }

    await ensureLedgerTable(client);

    if (!plan.pendingMigrations.length) {
      console.log("No pending migrations.");
      return;
    }

    console.log(`Applying ${plan.pendingMigrations.length} pending migration(s) to the database…\n`);
    for (const migration of plan.pendingMigrations) {
      try {
        await client.query("begin");
        await client.query(migration.sql);
        await client.query(
          `insert into ${MIGRATION_LEDGER_TABLE} (version, filename, checksum) values ($1, $2, $3)`,
          [migration.version, migration.filename, migration.checksum],
        );
        await client.query("commit");
        console.log(`  ✓ ${migration.filename}`);
      } catch (error) {
        await client.query("rollback").catch(() => {});
        console.error(`  ✗ ${migration.filename}: ${error.message}`);
        throw error;
      }
    }

    console.log("\nAll pending migrations applied. ✅");
  } finally {
    if (mutatingRun) {
      await client.query("select pg_advisory_unlock($1, $2)", MIGRATION_LOCK_KEY).catch(() => {});
    }
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
