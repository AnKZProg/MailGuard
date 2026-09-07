import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { withBackoff } from "@/lib/sync/backoff";
import { brandForDomain } from "@/lib/organize/brand";
import { domainOf } from "@/lib/mail/headers";
import { gmailFromDomain } from "@/lib/organize/sender-domain";
import { buildGmailBrandMap, findGraphBrandsParent, buildGraphBrandMap } from "@/lib/organize/brand-folders";
import { withAccountOrganizeLock } from "@/lib/organize/organize-by-sender";
import { listMessageIdsByLabel, getMessageMetadata, modifyLabels } from "@/lib/providers/google/gmail-client";
import { listAllMessagesWithSender, moveMessage } from "@/lib/providers/microsoft/graph-client";

export type FileIntoExistingSummary = { scanned: number; moved: number; failed: number };

/**
 * Lightweight, ongoing counterpart to organizeAccountBySender: files whatever
 * is currently sitting in the Inbox into a brand folder that ALREADY exists —
 * never creates a new one. Meant to be run regularly so freshly-arrived mail
 * from a brand you already have a folder for doesn't just sit back in the
 * Inbox until the next full organize pass. Shares organizeAccountBySender's
 * per-account lock — both mutate the same account's folders and can't safely
 * run concurrently with each other.
 */
export function fileAccountIntoExistingFolders(accountId: string): Promise<FileIntoExistingSummary> {
  return withAccountOrganizeLock(accountId, () => runFileAccountIntoExistingFolders(accountId));
}

async function runFileAccountIntoExistingFolders(accountId: string): Promise<FileIntoExistingSummary> {
  const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });

  let brandMap: Map<string, string>;
  if (account.provider === "GOOGLE") {
    brandMap = await buildGmailBrandMap(await getValidAccessToken(accountId));
  } else {
    const token = await getValidAccessToken(accountId);
    brandMap = await buildGraphBrandMap(token, await findGraphBrandsParent(token));
  }

  if (brandMap.size === 0) {
    return { scanned: 0, moved: 0, failed: 0 };
  }

  let scanned = 0;
  let moved = 0;
  let failed = 0;

  if (account.provider === "GOOGLE") {
    const ids = await listMessageIdsByLabel(await getValidAccessToken(accountId), "INBOX");
    for (const id of ids) {
      scanned++;
      try {
        const raw = await withBackoff(async () => getMessageMetadata(await getValidAccessToken(accountId), id));
        const brand = brandForDomain(gmailFromDomain(raw.payload?.headers));
        const destinationId = brand ? brandMap.get(brand.toLowerCase()) : undefined;
        if (!destinationId) continue;

        await withBackoff(async () => modifyLabels(await getValidAccessToken(accountId), id, [destinationId], ["INBOX"]));
        await db.message
          .updateMany({ where: { accountId, providerMessageId: id, state: "INBOX" }, data: { state: "ORGANIZED", providerFolder: destinationId } })
          .catch((err) => console.error(`[file-into-existing] mise à jour locale échouée pour ${id}`, err));
        moved++;
      } catch (err) {
        console.error(`[file-into-existing] échec pour le message ${id}`, err);
        failed++;
      }
    }
  } else {
    const messages = await withBackoff(async () => listAllMessagesWithSender(await getValidAccessToken(accountId), "inbox"));
    for (const message of messages) {
      scanned++;
      const address = message.from?.emailAddress?.address;
      const brand = address ? brandForDomain(domainOf(address.toLowerCase())) : null;
      const destinationId = brand ? brandMap.get(brand.toLowerCase()) : undefined;
      if (!destinationId) continue;

      try {
        await withBackoff(async () => moveMessage(await getValidAccessToken(accountId), message.id, destinationId));
        await db.message
          .updateMany({
            where: { accountId, providerMessageId: message.id, state: "INBOX" },
            data: { state: "ORGANIZED", providerFolder: destinationId },
          })
          .catch((err) => console.error(`[file-into-existing] mise à jour locale échouée pour ${message.id}`, err));
        moved++;
      } catch (err) {
        console.error(`[file-into-existing] échec pour le message ${message.id}`, err);
        failed++;
      }
    }
  }

  if (moved > 0 || failed > 0) {
    await db.auditLog.create({
      data: {
        actor: "USER",
        action: "file_into_existing_folders",
        accountId,
        messageIds: JSON.stringify([]),
        after: JSON.stringify({ scanned, moved, failed }),
      },
    });
  }

  return { scanned, moved, failed };
}

export async function fileAllAccountsIntoExistingFolders(): Promise<FileIntoExistingSummary> {
  const accounts = await db.account.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  const totals: FileIntoExistingSummary = { scanned: 0, moved: 0, failed: 0 };
  for (const account of accounts) {
    const summary = await fileAccountIntoExistingFolders(account.id);
    totals.scanned += summary.scanned;
    totals.moved += summary.moved;
    totals.failed += summary.failed;
  }
  return totals;
}
