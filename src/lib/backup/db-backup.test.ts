import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { backupDatabase, backupFileName, backupStatus, backupsToPrune, databaseFilePath } from "@/lib/backup/db-backup";

describe("backup naming and rotation", () => {
  it("resolves the Prisma file URL against the working directory", () => {
    expect(databaseFilePath("file:./data/mailguard.db", "/app")).toBe(path.resolve("/app", "data/mailguard.db"));
  });

  it("names one file per local day", () => {
    expect(backupFileName(new Date(2026, 9, 31, 23, 59))).toBe("mailguard-2026-10-31.db");
  });

  it("prunes the oldest beyond the kept count and ignores foreign files", () => {
    const names = ["notes.txt", ...[1, 2, 3, 4].map((d) => `mailguard-2026-10-0${d}.db`)];
    expect(backupsToPrune(names, 2)).toEqual(["mailguard-2026-10-01.db", "mailguard-2026-10-02.db"]);
    expect(backupsToPrune(names, 10)).toEqual([]);
  });
});

describe("backupDatabase on a real SQLite file", () => {
  let dir: string;
  let dbFile: string;
  let sqlite: Database.Database;
  const execute = async (sql: string) => sqlite.exec(sql);

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "mailguard-backup-"));
    dbFile = path.join(dir, "it's here.db");
    sqlite = new Database(dbFile);
    sqlite.pragma("journal_mode = WAL");
    sqlite.exec("create table t (v text); insert into t values ('kept');");
  });

  afterEach(() => {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes a readable copy, then skips the same day unless forced", async () => {
    const now = new Date(2026, 9, 31);
    const first = await backupDatabase(execute, dbFile, { now });
    expect(first.created).toBe(true);
    const copy = new Database(first.file, { readonly: true });
    expect(copy.prepare("select v from t").get()).toEqual({ v: "kept" });
    copy.close();

    expect((await backupDatabase(execute, dbFile, { now })).created).toBe(false);
    expect((await backupDatabase(execute, dbFile, { now, force: true })).created).toBe(true);
  });

  it("keeps only the last 7 days and reports the latest", async () => {
    const backups = path.join(dir, "backups");
    await backupDatabase(execute, dbFile, { now: new Date(2026, 9, 1) });
    for (let day = 2; day <= 9; day++) writeFileSync(path.join(backups, backupFileName(new Date(2026, 9, day))), "");
    const result = await backupDatabase(execute, dbFile, { now: new Date(2026, 9, 10) });

    expect(readdirSync(backups).sort()).toEqual([4, 5, 6, 7, 8, 9, 10].map((d) => backupFileName(new Date(2026, 9, d))));
    expect(result.pruned).toHaveLength(3);
    const status = await backupStatus(dbFile);
    expect(status.count).toBe(7);
    expect(status.latest?.name).toBe("mailguard-2026-10-10.db");
  });

  it("reports no backup before the first one", async () => {
    expect(await backupStatus(dbFile)).toMatchObject({ latest: null, count: 0 });
  });
});
