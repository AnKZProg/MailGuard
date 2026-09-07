import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { withBackoff } from "@/lib/sync/backoff";
import { trashMessage as gmailTrash } from "@/lib/providers/google/gmail-client";
import { moveMessage, getWellKnownFolderId } from "@/lib/providers/microsoft/graph-client";

/** Moves one message to the provider's trash (not a hard delete) and marks it TRASHED locally. */
export async function trashMessageById(messageId: string): Promise<void> {
  const message = await db.message.findUniqueOrThrow({ where: { id: messageId }, include: { account: true } });
  if (message.state === "TRASHED") return; // already done, avoid a stale-id provider call on a double-submit

  const accessToken = await getValidAccessToken(message.accountId);

  if (message.account.provider === "GOOGLE") {
    await withBackoff(() => gmailTrash(accessToken, message.providerMessageId));
  } else {
    const deletedItemsId = await withBackoff(() => getWellKnownFolderId(accessToken, "deleteditems"));
    await withBackoff(() => moveMessage(accessToken, message.providerMessageId, deletedItemsId));
  }

  await db.$transaction([
    db.message.update({ where: { id: messageId }, data: { state: "TRASHED" } }),
    db.auditLog.create({
      data: { actor: "USER", action: "trash", accountId: message.accountId, messageIds: JSON.stringify([messageId]) },
    }),
  ]);
}

export type BulkTrashSummary = { trashed: number; failed: number };

/** Trashes every message id given, best-effort — one failure doesn't stop the rest. */
export async function trashMessagesById(messageIds: string[]): Promise<BulkTrashSummary> {
  let trashed = 0;
  let failed = 0;
  for (const id of messageIds) {
    try {
      await trashMessageById(id);
      trashed++;
    } catch (err) {
      console.error(`[bulk-trash] échec pour ${id}`, err);
      failed++;
    }
  }
  return { trashed, failed };
}
