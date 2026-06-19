/**
 * Debator — admin takedown / report-review tool (P0-8).
 *
 * Removes reported content with operator authority. There is no in-app admin
 * role; this connects directly to Postgres via SUPABASE_DB_URL (a superuser
 * connection that bypasses RLS), the same out-of-band channel used to apply
 * migrations. NEVER ship this connection string to the client.
 *
 * Usage (Node 20.6+, loads secrets from .env.local):
 *   node --env-file=.env.local scripts/admin-takedown.mjs reports [limit]
 *   node --env-file=.env.local scripts/admin-takedown.mjs post    <postId>
 *   node --env-file=.env.local scripts/admin-takedown.mjs comment <commentUuid>
 *   node --env-file=.env.local scripts/admin-takedown.mjs handle  <userId>
 *   node --env-file=.env.local scripts/admin-takedown.mjs resolve <reportId> [status]
 *
 *   reports  — list open reports (newest first) with target + reason.
 *   post     — delete a shared match (cascades its votes/comments/reports).
 *   comment  — delete a single comment.
 *   handle   — clear an abusive username/avatar (keeps the account).
 *   resolve  — set a report's status (reviewed|actioned|dismissed; default actioned).
 *
 * Requires the `pg` dependency: run `npm install` first.
 *
 * SQL-editor fallback (no Node/pg needed) — paste into Supabase → SQL Editor:
 *   select * from public.shared_match_reports where status = 'open' order by created_at desc;
 *   delete from public.shared_matches where id = '<postId>';
 *   delete from public.shared_match_comments where id = '<commentUuid>';
 *   update public.profiles set username = null, avatar = null where user_id = '<userId>';
 */

import process from "node:process";

const conn = process.env.SUPABASE_DB_URL;
if (!conn) {
  console.error(
    "SUPABASE_DB_URL is not set. Run with:\n" +
      "  node --env-file=.env.local scripts/admin-takedown.mjs <command> …",
  );
  process.exit(1);
}

let Client;
try {
  ({ Client } = await import("pg"));
} catch {
  console.error("The 'pg' package is not installed. Run `npm install` first.");
  process.exit(1);
}

const [command, arg, extra] = process.argv.slice(2);
const VALID_STATUS = new Set(["reviewed", "actioned", "dismissed"]);

const client = new Client({ connectionString: conn });
await client.connect();

try {
  switch (command) {
    case "reports": {
      const limit = Number.isFinite(Number(arg)) && Number(arg) > 0 ? Number(arg) : 50;
      const { rows } = await client.query(
        `select id, post_id, comment_id, reason, status, created_at
           from public.shared_match_reports
          where status = 'open'
          order by created_at desc
          limit $1`,
        [limit],
      );
      if (rows.length === 0) {
        console.log("No open reports. 🎉");
        break;
      }
      console.log(`${rows.length} open report(s):\n`);
      for (const r of rows) {
        const target = r.comment_id ? `comment ${r.comment_id}` : `post ${r.post_id}`;
        console.log(
          `• [${r.id}] ${target}\n    reason: ${r.reason}    (${r.created_at.toISOString?.() ?? r.created_at})`,
        );
      }
      console.log(
        "\nAct on one with:\n" +
          "  …admin-takedown.mjs post <postId>   |   comment <commentUuid>   |   handle <userId>\n" +
          "Then mark it: …admin-takedown.mjs resolve <reportId> actioned",
      );
      break;
    }

    case "post": {
      if (!arg) throw new Error("Usage: post <postId>");
      const { rowCount } = await client.query(
        `delete from public.shared_matches where id = $1`,
        [arg],
      );
      console.log(
        rowCount > 0
          ? `Removed shared match ${arg} (and its votes/comments/reports).`
          : `No shared match with id ${arg}.`,
      );
      break;
    }

    case "comment": {
      if (!arg) throw new Error("Usage: comment <commentUuid>");
      const { rowCount } = await client.query(
        `delete from public.shared_match_comments where id = $1`,
        [arg],
      );
      console.log(
        rowCount > 0 ? `Removed comment ${arg}.` : `No comment with id ${arg}.`,
      );
      break;
    }

    case "handle": {
      if (!arg) throw new Error("Usage: handle <userId>");
      const { rowCount } = await client.query(
        `update public.profiles set username = null, avatar = null, updated_at = now()
          where user_id = $1`,
        [arg],
      );
      console.log(
        rowCount > 0 ? `Cleared handle/avatar for user ${arg}.` : `No profile for user ${arg}.`,
      );
      break;
    }

    case "resolve": {
      if (!arg) throw new Error("Usage: resolve <reportId> [reviewed|actioned|dismissed]");
      const status = extra && VALID_STATUS.has(extra) ? extra : "actioned";
      const { rowCount } = await client.query(
        `update public.shared_match_reports set status = $2 where id = $1`,
        [arg, status],
      );
      console.log(
        rowCount > 0 ? `Report ${arg} → ${status}.` : `No report with id ${arg}.`,
      );
      break;
    }

    default:
      console.error(
        "Unknown command. Use one of: reports | post | comment | handle | resolve\n" +
          "  node --env-file=.env.local scripts/admin-takedown.mjs reports",
      );
      process.exitCode = 1;
  }
} finally {
  await client.end();
}
