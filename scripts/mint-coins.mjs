/**
 * Debator — mint coins straight into a user's balance (docs/23_COINS.md).
 * Operator-only, over SUPABASE_DB_URL (like create-promo.mjs). Credits land
 * in the 'purchased' bucket (spendable on any fighter, never expire) with an
 * audit reason. Use negative --coins to claw back a grant.
 *
 * Usage:
 *   node scripts/mint-coins.mjs --user <uuid|email> --coins 500 [--note "owner grant"]
 *   node scripts/mint-coins.mjs --user <uuid|email> --balance   # just show balances
 */

import process from "node:process";
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

const userArg = flag("user");
if (!userArg) {
  console.error("Required: --user <uuid|email>. See the header for usage.");
  process.exit(1);
}

const { Client } = await import("pg");
const client = new Client({ connectionString: conn });
await client.connect();

try {
  // Resolve email → auth.users id (or accept a uuid directly).
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userArg);
  const u = await client.query(
    isUuid
      ? "select id, email from auth.users where id = $1"
      : "select id, email from auth.users where lower(email) = lower($1)",
    [userArg],
  );
  if (u.rows.length === 0) {
    console.error(`No user found for: ${userArg}`);
    process.exit(1);
  }
  const { id: userId, email } = u.rows[0];

  if (!has("balance")) {
    const coins = Number(flag("coins"));
    if (!Number.isInteger(coins) || coins === 0) {
      console.error("Required: --coins <non-zero int> (or --balance to just look).");
      process.exit(1);
    }
    const note = (flag("note") ?? "owner grant").replace(/[^\w\s.:-]/g, "").slice(0, 80);
    await client.query(
      `insert into coin_ledger (user_id, delta, bucket, reason)
         values ($1, $2, 'purchased', 'admin:' || $3)`,
      [userId, coins, note],
    );
    console.log(`Minted ${coins} coins for ${email ?? userId} ("${note}").`);
  }

  const b = await client.query(
    `select
       coalesce(sum(delta) filter (where bucket in ('purchased','promo')), 0)::int as purchased,
       coalesce(-sum(delta) filter (where bucket = 'daily'
         and (created_at at time zone 'utc')::date = (now() at time zone 'utc')::date), 0)::int as daily_spent
     from coin_ledger where user_id = $1`,
    [userId],
  );
  console.log(
    `Balance for ${email ?? userId}: ${b.rows[0].purchased} purchased/promo coins · ${b.rows[0].daily_spent} daily coins spent today`,
  );
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
