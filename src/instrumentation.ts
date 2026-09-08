export async function register() {
  // Only start the scheduler in the actual Node.js server process — this
  // file also runs (once) under the Edge runtime when one is configured,
  // where a Node-only module like better-sqlite3 can't load.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startServerAutoSync } = await import("@/lib/sync/server-auto-sync");
  startServerAutoSync();
}
