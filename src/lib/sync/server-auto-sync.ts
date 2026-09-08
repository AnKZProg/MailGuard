import { syncAllActiveAccounts } from "@/lib/sync/run-sync";

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_SYNC_DELAY_MS = 10 * 1000;

declare global {
  var __mailguardServerAutoSyncStarted: boolean | undefined;
}

async function runSync(): Promise<void> {
  const results = await syncAllActiveAccounts();
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) console.error(`[server-auto-sync] ${failed}/${results.length} compte(s) en échec`);
}

/**
 * Runs the periodic sync from the server process itself instead of relying
 * on the client-side AutoSync component's setInterval, which only fires
 * while a browser tab has the app open (and not until 5 minutes after that
 * tab was opened). Since MailGuard runs as a persistent local server
 * (Lancer-MailGuard.bat keeps `npm run start` running after the browser tab
 * closes), scheduling it here means new mail keeps getting classified and
 * quarantined/archived even when nobody is looking at the app.
 *
 * Guarded by a global flag because Next.js's instrumentation `register()`
 * can run more than once per process in some dev-mode reload scenarios —
 * without it, repeated calls would stack up duplicate intervals.
 */
export function startServerAutoSync(): void {
  if (globalThis.__mailguardServerAutoSyncStarted) return;
  globalThis.__mailguardServerAutoSyncStarted = true;

  setTimeout(() => {
    runSync().catch((err) => console.error("[server-auto-sync] échec de la synchro initiale", err));
  }, INITIAL_SYNC_DELAY_MS);

  setInterval(() => {
    runSync().catch((err) => console.error("[server-auto-sync] échec de la synchro périodique", err));
  }, AUTO_SYNC_INTERVAL_MS);
}
