import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  var __mailguardPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./data/mailguard.db",
  });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  client.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {
    // Best-effort: WAL mode is a performance optimization, not a correctness requirement.
  });
  return client;
}

export const db = globalThis.__mailguardPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__mailguardPrisma = db;
}
