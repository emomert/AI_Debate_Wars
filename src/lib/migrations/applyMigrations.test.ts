import { describe, expect, it } from "vitest";

import {
  buildPlan,
  checksumSql,
  migrationVersionFromFilename,
} from "../../../scripts/apply-migrations.mjs";

function migration(version: string, filename: string) {
  return {
    version,
    filename,
    path: `C:/repo/supabase/migrations/${filename}`,
    sql: `-- ${filename}\nselect ${version};`,
    checksum: checksumSql(`-- ${filename}\nselect ${version};`),
  };
}

const migrations = [
  migration("0001", "0001_alpha.sql"),
  migration("0002", "0002_beta.sql"),
  migration("0003", "0003_gamma.sql"),
  migration("0004", "0004_delta.sql"),
];

describe("migrationVersionFromFilename", () => {
  it("parses the four-digit prefix", () => {
    expect(migrationVersionFromFilename("0014_daily_claim.sql")).toBe("0014");
  });

  it("rejects files that do not match the migration naming scheme", () => {
    expect(() => migrationVersionFromFilename("daily_claim.sql")).toThrow(/Invalid migration filename/);
  });
});

describe("checksumSql", () => {
  it("is stable for identical SQL and changes when the SQL changes", () => {
    const sql = "select 1;";
    expect(checksumSql(sql)).toBe(checksumSql(sql));
    expect(checksumSql(sql)).not.toBe(checksumSql("select 2;"));
    expect(checksumSql("select 1;\r\n")).toBe(checksumSql("select 1;\n"));
  });
});

describe("buildPlan", () => {
  it("applies only the pending suffix when the ledger is already ahead of earlier migrations", () => {
    const plan = buildPlan({
      migrations,
      refs: ["0003_gamma.sql", "0004_delta.sql"],
      appliedVersions: ["0001", "0002"],
      hasLedgerRows: true,
      hasTrackedObjects: true,
      statusOnly: false,
      dryRun: false,
      baselineThrough: null,
    });

    expect(plan.pendingMigrations.map((item) => item.version)).toEqual(["0003", "0004"]);
  });

  it("rejects a requested migration list that skips a pending predecessor", () => {
    expect(() =>
      buildPlan({
        migrations,
        refs: ["0004_delta.sql"],
        appliedVersions: ["0001"],
        hasLedgerRows: true,
        hasTrackedObjects: true,
        statusOnly: false,
        dryRun: false,
        baselineThrough: null,
      }),
    ).toThrow(/skip pending 0002_beta\.sql/);
  });

  it("refuses to replay an existing schema without a ledger", () => {
    expect(() =>
      buildPlan({
        migrations,
        refs: [],
        appliedVersions: [],
        hasLedgerRows: false,
        hasTrackedObjects: true,
        statusOnly: false,
        dryRun: false,
        baselineThrough: null,
      }),
    ).toThrow(/Baseline it explicitly/);
  });

  it("baselines only through the requested version and never marks later migrations applied", () => {
    const plan = buildPlan({
      migrations,
      refs: [],
      appliedVersions: [],
      hasLedgerRows: false,
      hasTrackedObjects: true,
      statusOnly: false,
      dryRun: false,
      baselineThrough: "0003",
    });

    expect(plan.mode).toBe("baseline");
    expect(plan.migrations.map((item) => item.version)).toEqual(["0001", "0002", "0003"]);
    expect(plan.pendingMigrations.map((item) => item.version)).toEqual(["0001", "0002", "0003"]);
    expect(plan.migrations.some((item) => item.version === "0004")).toBe(false);
  });

  it("rejects baseline mode when rows already exist in the ledger", () => {
    expect(() =>
      buildPlan({
        migrations,
        refs: [],
        appliedVersions: ["0001"],
        hasLedgerRows: true,
        hasTrackedObjects: true,
        statusOnly: false,
        dryRun: false,
        baselineThrough: "0003",
      }),
    ).toThrow(/empty migration ledger/);
  });
});
