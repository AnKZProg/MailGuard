import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { withBackoff } from "@/lib/sync/backoff";
import { trashMessage } from "@/lib/providers/google/gmail-client";
import { moveMessage, getWellKnownFolderId } from "@/lib/providers/microsoft/graph-client";
import type { QuarantineItem, Message, Account, AuditActor } from "@prisma/client";

export type PurgeSummary = { purged: number; failed: number };

type ItemWithMessage = QuarantineItem & { message: Message & { account: Account } };

async function purgeItems(items: ItemWithMessage[], actor: AuditActor): Promise<PurgeSummary> {
  let purged = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const { message } = item;
      const accessToken = await getValidAccessToken(message.accountId);

      if (message.account.provider === "GOOGLE") {
        await withBackoff(() => trashMessage(accessToken, message.providerMessageId));
      } else {
        const deletedItemsId = await withBackoff(() => getWellKnownFolderId(accessToken, "deleteditems"));
        await withBackoff(() => moveMessage(accessToken, message.providerMessageId, deletedItemsId));
      }

      await db.$transaction([
        db.quarantineItem.update({ where: { messageId: item.messageId }, data: { purgedAt: new Date() } }),
        db.message.update({ where: { id: item.messageId }, data: { state: "TRASHED" } }),
        db.auditLog.create({
          data: { actor, action: "purge", accountId: message.accountId, messageIds: JSON.stringify([item.messageId]) },
        }),
      ]);
      purged++;
    } catch (err) {
      console.error(`[purge] échec pour l'item ${item.id}`, err);
      failed++;
    }
  }

  return { purged, failed };
}

/** Moves every quarantine item past its retention date to the provider's trash. Never
 * hard-deletes — permanent deletion stays a manual, explicit action outside this engine. */
export async function purgeDueItems(): Promise<PurgeSummary> {
  const due = await db.quarantineItem.findMany({
    where: { purgeAfter: { lte: new Date() }, purgedAt: null, restoredAt: null },
    include: { message: { include: { account: true } } },
  });
  return purgeItems(due, "ENGINE");
}

/** User-triggered "Tout supprimer": purges every active quarantine item immediately,
 * ignoring the retention countdown. Still moves to the provider's trash, never a
 * permanent hard-delete. */
export async function purgeAllActiveItems(): Promise<PurgeSummary> {
  const active = await db.quarantineItem.findMany({
    where: { purgedAt: null, restoredAt: null },
    include: { message: { include: { account: true } } },
  });
  return purgeItems(active, "USER");
}
