import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { withBackoff } from "@/lib/sync/backoff";
import { modifyLabels, untrashMessage } from "@/lib/providers/google/gmail-client";
import { moveMessage } from "@/lib/providers/microsoft/graph-client";
import type { RestoreSnapshot } from "@/lib/quarantine/quarantine";

export class RestoreFailedError extends Error {}

export async function restoreMessage(messageId: string): Promise<void> {
  const item = await db.quarantineItem.findUnique({
    where: { messageId },
    include: { message: { include: { account: true } } },
  });
  if (!item) throw new RestoreFailedError("Ce message n'est pas (ou plus) en quarantaine.");
  if (item.restoredAt) return; // already restored, no-op

  const { message } = item;
  const accessToken = await getValidAccessToken(message.accountId);
  const snapshot = JSON.parse(item.restoreSnapshot) as RestoreSnapshot;

  try {
    if (snapshot.provider === "GOOGLE") {
      // Both calls are retried with backoff (unlike a single atomic call) so a
      // transient failure right after untrash succeeds doesn't strand the
      // message out of Trash but still unlabeled. If it still fails after
      // retries, untrash is idempotent — the user can just retry restore.
      await withBackoff(() => untrashMessage(accessToken, message.providerMessageId));
      await withBackoff(() => modifyLabels(accessToken, message.providerMessageId, snapshot.labelsToRestore, []));
    } else {
      await withBackoff(() => moveMessage(accessToken, message.providerMessageId, snapshot.parentFolderId));
    }
  } catch (err) {
    throw new RestoreFailedError(
      `Impossible de restaurer ce message côté ${snapshot.provider === "GOOGLE" ? "Gmail" : "Outlook"} — il a peut-être été déplacé ou supprimé manuellement.`,
      { cause: err },
    );
  }

  await db.$transaction([
    db.quarantineItem.update({ where: { messageId }, data: { restoredAt: new Date() } }),
    // providerSpamFlag: false too, not just state — reclassifyProviderFlaggedMessages
    // (run on every sync) re-scans every INBOX message with providerSpamFlag still
    // true and reclassifies it. Leaving the flag set meant a restored message got
    // re-scored with the strong "provider already flagged this as spam" signal
    // (weight 0.65) on the very next sync, reproduced the same SPAM/PHISHING
    // verdict, and classifyAndPersist silently re-quarantined it — undoing the
    // restore within minutes, with nothing in the UI explaining why the message
    // vanished again. A manual restore is the user overriding the provider's own
    // opinion on this specific message, so that signal must not still apply after.
    db.message.update({ where: { id: messageId }, data: { state: "INBOX", providerSpamFlag: false } }),
    db.auditLog.create({
      data: {
        actor: "USER",
        action: "restore",
        accountId: message.accountId,
        messageIds: JSON.stringify([messageId]),
      },
    }),
  ]);
}
