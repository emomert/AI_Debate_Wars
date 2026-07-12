/**
 * Debator — mint a promo code (docs/23_COINS.md). Operator-only, runs over the
 * direct Postgres connection (SUPABASE_DB_URL) like apply-migrations.mjs.
 * Redemption guardrails live in the coin_redeem_promo RPC (one per account,
 * expiry, global cap, attempt limiting); this script only creates the row.
 *
 * Usage:
 *   node scripts/create-promo.mjs --coins 50 --max 100 [--days 30] [--code LAUNCH-ABC12]
 *
 *   --coins  coins granted per redemption (required)
 *   --max    total number of accounts that can redeem it (required)
 *   --days   expires N days from now (omit = never expires)
 *   --code   explicit code (omit = generated high-entropy: PREFIX-XXXXX)
 *   --prefix prefix for generated codes (default "DEBATOR")
 *   --list   list existing codes instead of creating one
 */

import process from "node:process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

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

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

const { Client } = await import("pg");
const client = new Client({ connectionString: conn });
await client.connect();

try {
  if (has("list")) {
    const r = await client.query(
      `select code, coins, redeemed_count, max_redemptions, active,
              to_char(expires_at, 'YYYY-MM-DD') as expires
         from promo_codes order by created_at desc limit 50`,
    );
    console.table(r.rows);
    process.exit(0);
  }

  const coins = Number(flag("coins"));
  const max = Number(flag("max"));
  if (!Number.isInteger(coins) || coins <= 0 || !Number.isInteger(max) || max <= 0) {
    console.error("Required: --coins <int> --max <int>. See the header for usage.");
    process.exit(1);
  }
  const days = flag("days") ? Number(flag("days")) : null;
  if (days !== null && (!Number.isFinite(days) || days <= 0)) {
    console.error("--days must be a positive number.");
    process.exit(1);
  }

  // High-entropy generated codes (Crockford-ish alphabet, no 0/O/1/I): ~25 bits
  // for 5 chars — combined with the in-DB 10 attempts/hour/user limit, brute
  // force is impractical. Pass --code for memorable marketing codes at your
  // own risk (they burn redemptions faster when guessed).
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const gen = (n) =>
    Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");
  const code = (flag("code") ?? `${flag("prefix") ?? "DEBATOR"}-${gen(5)}`).toUpperCase().trim();

  const r = await client.query(
    `insert into promo_codes (code, coins, max_redemptions, expires_at)
       values ($1, $2, $3, case when $4::int is null then null else now() + ($4::int || ' days')::interval end)
     returning code, coins, max_redemptions, to_char(expires_at, 'YYYY-MM-DD HH24:MI') as expires`,
    [code, coins, max, days],
  );
  const row = r.rows[0];
  console.log(`\nPromo code created:`);
  console.log(`  code:    ${row.code}`);
  console.log(`  grants:  ${row.coins} coins`);
  console.log(`  max:     ${row.max_redemptions} redemptions`);
  console.log(`  expires: ${row.expires ?? "never"}`);
} catch (err) {
  if (err.code === "23505") {
    console.error("That code already exists — pick another.");
  } else {
    console.error("Failed:", err.message);
  }
  process.exit(1);
} finally {
  await client.end();
}
