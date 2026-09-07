import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueueSync } from "@/lib/sync/run-sync";
import { purgeDueItems } from "@/lib/quarantine/purge";
import { isSameOriginRequest } from "@/lib/http/same-origin";
import { mapWithConcurrency } from "@/lib/concurrency";

// Every account's sync also does many small SQLite writes against the same
// on-disk file — syncing all accounts fully concurrently (previously
// Promise.allSettled with no cap) made unrelated page loads stall for
// seconds behind the write-lock contention. This keeps most of the
// network-bound speedup of running several accounts at once while capping
// how many can be writing to the DB at the same instant.
const SYNC_CONCURRENCY = 3;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "cross_origin_forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}) as { accountId?: string });
  const accountIds = body.accountId
    ? [body.accountId]
    : (await db.account.findMany({ where: { status: "ACTIVE" }, select: { id: true } })).map((a) => a.id);

  const results = await mapWithConcurrency(accountIds, SYNC_CONCURRENCY, (id) => enqueueSync(id));
  const failed = results.filter((r) => r.status === "rejected").length;

  const purgeSummary = await purgeDueItems().catch((err) => {
    console.error("[api/sync] purge failed", err);
    return { purged: 0, failed: 0 };
  });

  return NextResponse.json({ synced: accountIds.length - failed, failed, purge: purgeSummary });
}
