import { NextResponse } from "next/server";
import { enqueueSync, syncAllActiveAccounts } from "@/lib/sync/run-sync";
import { purgeDueItems } from "@/lib/quarantine/purge";
import { isSameOriginRequest } from "@/lib/http/same-origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "cross_origin_forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}) as { accountId?: string });
  let total: number;
  let failed: number;
  if (body.accountId) {
    total = 1;
    failed = await enqueueSync(body.accountId).then(
      () => 0,
      () => 1,
    );
  } else {
    const results = await syncAllActiveAccounts();
    total = results.length;
    failed = results.filter((r) => r.status === "rejected").length;
  }

  const purgeSummary = await purgeDueItems().catch((err) => {
    console.error("[api/sync] purge failed", err);
    return { purged: 0, failed: 0 };
  });

  return NextResponse.json({ synced: total - failed, failed, purge: purgeSummary });
}
