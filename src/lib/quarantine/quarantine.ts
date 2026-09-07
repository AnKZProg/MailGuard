import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { getQuarantineDays } from "@/lib/settings/app-settings";
import { withBackoff } from "@/lib/sync/backoff";
import { trashMessage } from "@/lib/providers/google/gmail-client";
import { moveMessage, getWellKnownFolderId } from "@/lib/providers/microsoft/graph-client";

type GmailSnapshot = { provider: "GOOGLE"; labelsToRestore: string[] };
type GraphSnapshot = { provider: "MICROSOFT"; parentFolderId: string };
export type RestoreSnapshot = GmailSnapshot | GraphSnapshot;

/**
 * Moves a spam/phishing message straight to the provider's own Trash / Deleted
 * Items — recoverable there (see restoreMessage) but out of the inbox
 * immediately, with nothing extra left visible in the mailbox's folder list.
 */
export async function quarantineMessage(messageId: string, reason: "spam" | "phishing"): Promise<void> {
  const message = await db.message.findUniqueOrThrow({ where: { id: messageId }, include: { account: true } });
  if (message.state === "QUARANTINED") return; // already done, avoid double-move on a re-run

  const accessToken = await getValidAccessToken(message.accountId);

  // Backoff, same as every other provider mutation in this codebase — if it
  // still fails after retries, classifyAndPersist clears classifiedAt so this
  // message gets classified and quarantined again on the next sync instead of
  // being stuck with a verdict that was never actually acted on.
  let snapshot: RestoreSnapshot;
  if (message.account.provider === "GOOGLE") {
    const currentLabels = message.providerLabels ? message.providerLabels.split(",").filter(Boolean) : [];
    snapshot = { provider: "GOOGLE", labelsToRestore: currentLabels.includes("INBOX") ? ["INBOX"] : currentLabels };
    await withBackoff(() => trashMessage(accessToken, message.providerMessageId));
  } else {
    snapshot = { provider: "MICROSOFT", parentFolderId: message.providerFolder ?? "inbox" };
    const deletedItemsId = await withBackoff(() => getWellKnownFolderId(accessToken, "deleteditems"));
    await withBackoff(() => moveMessage(accessToken, message.providerMessageId, deletedItemsId));
  }

  const quarantineDays = await getQuarantineDays();
  const now = new Date();

  const purgeAfter = new Date(now.getTime() + quarantineDays * 24 * 60 * 60 * 1000);

  await db.$transaction([
    // upsert, not create: messageId is unique, and a message restored once
    // before (its QuarantineItem row still exists, restoredAt set, never
    // deleted) can legitimately get reclassified as spam/phishing again later
    // — a plain create would fail that with a unique constraint violation.
    db.quarantineItem.upsert({
      where: { messageId },
      create: {
        messageId,
        accountId: message.accountId,
        quarantinedAt: now,
        purgeAfter,
        reason,
        restoreSnapshot: JSON.stringify(snapshot),
      },
      update: {
        quarantinedAt: now,
        purgeAfter,
        reason,
        restoreSnapshot: JSON.stringify(snapshot),
        restoredAt: null,
        purgedAt: null,
      },
    }),
    db.message.update({ where: { id: messageId }, data: { state: "QUARANTINED" } }),
    db.auditLog.create({
      data: {
        actor: "ENGINE",
        action: "quarantine",
        accountId: message.accountId,
        messageIds: JSON.stringify([messageId]),
        after: JSON.stringify({ reason }),
      },
    }),
  ]);
}
