import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { withBackoff } from "@/lib/sync/backoff";
import { listMessageIds, getMessageMetadata } from "@/lib/providers/google/gmail-client";
import { mapGmailMessage } from "@/lib/providers/google/mapper";
import { listMessages, getWellKnownFolderId } from "@/lib/providers/microsoft/graph-client";
import { mapGraphMessage } from "@/lib/providers/microsoft/mapper";
import type { NormalizedMessage } from "@/lib/mail/types";
import { classifyAndPersist } from "@/lib/classify/classify-and-persist";
import { runSecurityAudit } from "@/lib/security/run-audit";
import { emptyTrash } from "@/lib/maintenance/empty-trash";
import { reclassifyProviderFlaggedMessages } from "@/lib/maintenance/reclassify-junk";
import { mapWithConcurrency } from "@/lib/concurrency";

// Every account's sync also does many small SQLite writes against the same
// on-disk file — syncing all accounts fully concurrently made unrelated page
// loads stall for seconds behind write-lock contention. This keeps most of
// the network-bound speedup of running several accounts at once while
// capping how many can be writing to the DB at the same instant.
const SYNC_CONCURRENCY = 3;

/** Syncs every ACTIVE account, isolated per account (mapWithConcurrency never
 * lets one account's rejection stop the others). Shared by the manual/auto
 * "Synchroniser" API route and the server-side background scheduler so both
 * use the exact same concurrency and account-selection logic. */
export async function syncAllActiveAccounts(): Promise<PromiseSettledResult<void>[]> {
  const accountIds = (await db.account.findMany({ where: { status: "ACTIVE" }, select: { id: true } })).map((a) => a.id);
  return mapWithConcurrency(accountIds, SYNC_CONCURRENCY, (id) => enqueueSync(id));
}

const DEFAULT_WINDOW_DAYS = 30;
// Junk/Spam folders are rescanned on a fixed window every sync (not gated by
// lastSyncAt) — the provider already filtered this mail out of the inbox once,
// there's no "incremental" cursor to trust here, and re-listing is cheap since
// already-seen ids are deduped before any per-message fetch.
const JUNK_RESCAN_WINDOW_DAYS = 30;
const accountSyncQueue = new Map<string, Promise<void>>();

/**
 * Serializes syncs per account so an overlapping manual trigger can't race a
 * scheduled one. `.then(runNext, runNext)` — not just `.then(runNext)` —
 * matters: if a *previous* queued sync rejected, a plain `.then(onFulfilled)`
 * with no rejection handler would propagate that old rejection straight
 * through instead of ever calling `runSyncForAccount` for this new request,
 * silently skipping every sync queued after the first failure.
 */
export function enqueueSync(accountId: string): Promise<void> {
  const previous = accountSyncQueue.get(accountId) ?? Promise.resolve();
  const runNext = () => runSyncForAccount(accountId);
  const next = previous.then(runNext, runNext).finally(() => {
    if (accountSyncQueue.get(accountId) === next) accountSyncQueue.delete(accountId);
  });
  accountSyncQueue.set(accountId, next);
  return next;
}

async function runSyncForAccount(accountId: string): Promise<void> {
  const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });
  const startedAt = new Date();
  const since = account.lastSyncAt ?? new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const syncRun = await db.syncRun.create({
    data: { accountId, kind: account.lastSyncAt ? "INCREMENTAL" : "FULL", startedAt },
  });

  let messagesSeen = 0;
  try {
    const accessToken = await getValidAccessToken(accountId);
    const normalized =
      account.provider === "GOOGLE"
        ? await fetchNewGmailMessages(accountId, accessToken, since)
        : await fetchNewGraphMessages(accessToken, since);

    for (const message of normalized) {
      try {
        const stored = await db.message.upsert({
          where: { accountId_providerMessageId: { accountId, providerMessageId: message.providerMessageId } },
          create: {
            accountId,
            providerMessageId: message.providerMessageId,
            threadId: message.threadId,
            internetMessageId: message.internetMessageId,
            fromAddress: message.fromAddress,
            fromDomain: message.fromDomain,
            fromDisplayName: message.fromDisplayName,
            replyToDomain: message.replyToDomain,
            toCount: message.toCount,
            subject: message.subject,
            snippet: message.snippet,
            receivedAt: message.receivedAt,
            isRead: message.isRead,
            hasAttachments: message.hasAttachments,
            attachmentTypes: message.attachmentTypes.join(","),
            listUnsubscribe: message.listUnsubscribe,
            listUnsubscribePost: message.listUnsubscribePost,
            listId: message.listId,
            precedence: message.precedence,
            authSpf: message.authSpf,
            authDkim: message.authDkim,
            authDmarc: message.authDmarc,
            providerSpamFlag: message.providerSpamFlag,
            providerFolder: message.providerFolder,
            providerLabels: message.providerLabels.join(","),
          },
          update: {
            isRead: message.isRead,
            providerFolder: message.providerFolder,
            providerLabels: message.providerLabels.join(","),
          },
        });
        messagesSeen++;

        if (!stored.classifiedAt) {
          await classifyAndPersist(stored.id);
        }
      } catch (err) {
        // One malformed/unusual message must not block classification for
        // every message still queued after it in this account's batch — that
        // silently stalls the whole account (nothing past the bad message
        // ever gets classified, quarantined, or archived) until someone
        // notices and digs through logs.
        console.error(`[sync] échec pour le message ${message.providerMessageId}`, err);
      }
    }

    await runSecurityAudit(accountId, account.provider).catch((err) => {
      // A failed audit shouldn't fail the whole sync — the next run tries again.
      console.error(`[sync] audit sécurité échoué pour ${accountId}`, err);
    });

    await emptyTrash(accountId, account.provider).catch((err) => {
      console.error(`[sync] vidage de la corbeille échoué pour ${accountId}`, err);
    });

    await reclassifyProviderFlaggedMessages(accountId).catch((err) => {
      console.error(`[sync] revérification du courrier indésirable échouée pour ${accountId}`, err);
    });

    await db.account.update({ where: { id: accountId }, data: { lastSyncAt: startedAt, status: "ACTIVE" } });
    await db.syncRun.update({ where: { id: syncRun.id }, data: { finishedAt: new Date(), messagesSeen } });
  } catch (err) {
    await db.syncRun.update({
      where: { id: syncRun.id },
      data: { finishedAt: new Date(), messagesSeen, error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

async function listGmailIds(accessToken: string, sinceEpochSeconds: number, scope: "default" | "spam"): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await withBackoff(() => listMessageIds(accessToken, sinceEpochSeconds, pageToken, scope));
    for (const m of page.messages ?? []) ids.push(m.id);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return ids;
}

async function fetchNewGmailMessages(accountId: string, accessToken: string, since: Date): Promise<NormalizedMessage[]> {
  const sinceEpochSeconds = Math.floor(since.getTime() / 1000);
  const junkSinceEpochSeconds = Math.floor(
    Math.min(since.getTime(), Date.now() - JUNK_RESCAN_WINDOW_DAYS * 24 * 60 * 60 * 1000) / 1000,
  );

  const [inboxIds, spamIds] = await Promise.all([
    listGmailIds(accessToken, sinceEpochSeconds, "default"),
    listGmailIds(accessToken, junkSinceEpochSeconds, "spam"),
  ]);
  const candidateIds = [...new Set([...inboxIds, ...spamIds])];

  if (candidateIds.length === 0) return [];

  const existing = await db.message.findMany({
    where: { accountId, providerMessageId: { in: candidateIds } },
    select: { providerMessageId: true },
  });
  const existingIds = new Set(existing.map((m) => m.providerMessageId));
  const newIds = candidateIds.filter((id) => !existingIds.has(id));

  const messages: NormalizedMessage[] = [];
  for (const id of newIds) {
    const raw = await withBackoff(() => getMessageMetadata(accessToken, id));
    messages.push(mapGmailMessage(raw));
  }
  return messages;
}

async function listGraphFolder(
  accessToken: string,
  sinceIso: string,
  folder: "inbox" | "junkemail",
  junkFolderId: string | null,
  isKnownJunk: boolean,
): Promise<NormalizedMessage[]> {
  const messages: NormalizedMessage[] = [];
  let nextLink: string | undefined;
  do {
    const page = await withBackoff(() => listMessages(accessToken, sinceIso, folder, nextLink));
    for (const raw of page.value) messages.push(mapGraphMessage(raw, junkFolderId, isKnownJunk));
    nextLink = page["@odata.nextLink"];
  } while (nextLink);
  return messages;
}

async function fetchNewGraphMessages(accessToken: string, since: Date): Promise<NormalizedMessage[]> {
  const junkFolderId = await withBackoff(() => getWellKnownFolderId(accessToken, "junkemail")).catch(() => null);
  const junkSince = new Date(Math.min(since.getTime(), Date.now() - JUNK_RESCAN_WINDOW_DAYS * 24 * 60 * 60 * 1000));

  const [inbox, junk] = await Promise.all([
    listGraphFolder(accessToken, since.toISOString(), "inbox", junkFolderId, false),
    listGraphFolder(accessToken, junkSince.toISOString(), "junkemail", junkFolderId, true),
  ]);

  const seen = new Set<string>();
  const merged: NormalizedMessage[] = [];
  for (const message of [...inbox, ...junk]) {
    if (seen.has(message.providerMessageId)) continue;
    seen.add(message.providerMessageId);
    merged.push(message);
  }
  return merged;
}
