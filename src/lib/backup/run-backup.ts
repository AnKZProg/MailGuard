import { db } from "@/lib/db";
import { backupDatabase, backupStatus, databaseFilePath, type BackupResult, type BackupStatus } from "@/lib/backup/db-backup";

const DEFAULT_DATABASE_URL = "file:./data/mailguard.db";

function currentDatabaseFile(): string {
  return databaseFilePath(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL, process.cwd());
}

/** Raw SQL here is a fixed statement plus a path MailGuard builds itself — no user input reaches it. */
export function backupNow(options: { force?: boolean } = {}): Promise<BackupResult> {
  return backupDatabase((sql) => db.$executeRawUnsafe(sql), currentDatabaseFile(), options);
}

export function currentBackupStatus(): Promise<BackupStatus> {
  return backupStatus(currentDatabaseFile());
}
