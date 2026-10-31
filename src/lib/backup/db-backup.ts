import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Daily snapshot of the local database (verdicts, learner, quarantine state,
 * blocked senders, encrypted tokens) with a 7-day rotation. Copies live next to
 * the database in data/backups — gitignored like the database itself — and are
 * only usable with the same MAILGUARD_ENCRYPTION_KEY, since tokens stay encrypted.
 *
 * `VACUUM INTO` writes a consistent, compacted copy through the app's own
 * connection, so a sync running at the same moment can't produce a torn file.
 */
export const BACKUPS_KEPT = 7;
const PREFIX = "mailguard-";
const SUFFIX = ".db";

export type SqlExecutor = (sql: string) => Promise<unknown>;

export function databaseFilePath(databaseUrl: string, cwd: string): string {
  return path.resolve(cwd, databaseUrl.replace(/^file:/, ""));
}

export function backupDirectory(databaseFile: string): string {
  return path.join(path.dirname(databaseFile), "backups");
}

/** One file per local calendar day: re-running the same day replaces nothing and is skipped. */
export function backupFileName(date: Date): string {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${PREFIX}${day}${SUFFIX}`;
}

export function backupsToPrune(fileNames: string[], keep = BACKUPS_KEPT): string[] {
  const backups = fileNames.filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX)).sort();
  return backups.slice(0, Math.max(0, backups.length - keep));
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(
    () => true,
    () => false,
  );
}

export type BackupResult = { file: string; created: boolean; pruned: string[] };

export async function backupDatabase(
  execute: SqlExecutor,
  databaseFile: string,
  { now = new Date(), force = false }: { now?: Date; force?: boolean } = {},
): Promise<BackupResult> {
  const dir = backupDirectory(databaseFile);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, backupFileName(now));

  let created = false;
  if (force || !(await exists(file))) {
    // Written under a temporary name and renamed once complete: a crash mid-copy must not leave
    // a truncated file that later runs would take for today's finished backup.
    const partial = `${file}.partial`;
    await rm(partial, { force: true });
    await execute(`VACUUM INTO '${partial.replaceAll("'", "''")}'`);
    await rename(partial, file);
    created = true;
  }

  const pruned = backupsToPrune(await readdir(dir));
  await Promise.all(pruned.map((name) => rm(path.join(dir, name))));
  return { file, created, pruned };
}

export type BackupStatus = { latest: { name: string; at: Date } | null; count: number; directory: string };

export async function backupStatus(databaseFile: string): Promise<BackupStatus> {
  const directory = backupDirectory(databaseFile);
  const names = (await readdir(directory).catch(() => [] as string[]))
    .filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
    .sort();
  const latestName = names.at(-1);
  const latest = latestName ? { name: latestName, at: (await stat(path.join(directory, latestName))).mtime } : null;
  return { latest, count: names.length, directory };
}
