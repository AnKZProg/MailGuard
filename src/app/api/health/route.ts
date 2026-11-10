import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Polled by the Docker healthcheck: "up" means the server answers *and* the
// database file is readable, not just that a process exists. Says nothing
// else about the install — no counts, no account data.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[health] base de données inaccessible", err);
    return NextResponse.json({ status: "db_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
