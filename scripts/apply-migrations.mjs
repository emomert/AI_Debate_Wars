/**
 * Debator — apply SQL migrations over the direct Postgres connection.
 *
 * Uses SUPABASE_DB_URL (out-of-band admin connection; never shipped to the
 * client). Each file runs in its own transaction and the migrations are written
 * idempotently (IF NOT EXISTS / CREATE OR REPLACE / guarded do-blocks), so this
 * is safe to re-run. Pass specific files to apply a subset; with no args it
 * applies every supabase/migrations/*.sql in sorted order.
 *
 * Usage:
 *   node scripts/apply-migrations.mjs                       # all, in order
 *   node scripts/apply-migrations.mjs 0005_consent.sql 0006_reports.sql
 *   node --env-file=.env.local scripts/apply-migrations.mjs # if not auto-found
 */

import process from "node:process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const migDir = join(repoRoot, "supabase", "migrations");

// Connection string: prefer the env var; fall back to parsing .env.local so this
// works without Node's --env-file flag.
let conn = process.env.SUPABASE_DB_URL;
if (!conn) {
  try {
    const env = readFileSync(join(repoRoot, ".env.local"), "utf8");
    const m = env.match(/^\s*SUPABASE_DB_URL\s*=\s*(.+)$/m);
    if (m) conn = m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local */
  }
}
if (!conn) {
  console.error("SUPABASE_DB_URL is not set (env or .env.local).");
  process.exit(1);
}

let Client;
try {
  ({ Client } = await import("pg"));
} catch {
  console.error("The 'pg' package is not installed. Run `npm install` first.");
  process.exit(1);
}

const args = process.argv.slice(2);
const files = (
  args.length
    ? args.map((a) => (/[\\/]/.test(a) ? a : join(migDir, a)))
    : readdirSync(migDir)
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .map((f) => join(migDir, f))
);

// Supabase requires SSL and presents its own CA (not in Node's trust store).
// Use libpq 'require' semantics — an ENCRYPTED connection without CA chain
// verification, the standard for an admin tool hitting managed Postgres — via
// the connection string rather than overriding TLS verification in code. For
// strict verification, supply the Supabase CA (sslrootcert + sslmode=verify-full).
if (!/sslmode=/.test(conn)) {
  conn += (conn.includes("?") ? "&" : "?") + "uselibpqcompat=true&sslmode=require";
}
const client = new Client({ connectionString: conn });
await client.connect();
console.log(`Applying ${files.length} migration(s) to the database…\n`);
let failed = false;
try {
  for (const file of files) {
    const name = file.split(/[\\/]/).pop();
    const sql = readFileSync(file, "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
      console.log(`  ✓ ${name}`);
    } catch (err) {
      await client.query("rollback").catch(() => {});
      console.error(`  ✗ ${name}: ${err.message}`);
      failed = true;
      break;
    }
  }
} finally {
  await client.end();
}
if (failed) process.exit(1);
console.log("\nAll migrations applied. ✅");
