import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { withBackoff } from "@/lib/sync/backoff";
import { brandForDomain } from "@/lib/organize/brand";
import { domainOf } from "@/lib/mail/headers";
import { gmailFromDomain } from "@/lib/organize/sender-domain";
import { GMAIL_BRANDS_PREFIX, buildGmailBrandMap, findGraphBrandsParent, ensureGraphBrandsParent, buildGraphBrandMap } from "@/lib/organize/brand-folders";
import { ensureLabel, listMessageIdsByLabel, getMessageMetadata, modifyLabels } from "@/lib/providers/google/gmail-client";
import { ensureChildFolder, listAllMessagesWithSender, moveMessage } from "@/lib/providers/microsoft/graph-client";

// Below this, a brand folder would hold one or two one-off senders — noise,
// not organization. Real recurring senders (stores, games, services) clear
// this easily across a real inbox's history.
const MIN_GROUP_SIZE = 3;

export type OrganizeBySenderSummary = {
  scanned: number;
  groups: number;
  moved: number;
  failed: number;
  foldersCreated: number;
  foldersReused: number;
};

// Serializes organize/file runs per account — nothing else guards against two
// bulk-mutation passes (this one and fileAccountIntoExistingFolders) racing on
// the same account's folders, e.g. both trying to create the same
// not-yet-existing brand folder at once.
const accountOrganizeQueue = new Map<string, Promise<unknown>>();

export function withAccountOrganizeLock<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
  const previous = accountOrganizeQueue.get(accountId) ?? Promise.resolve();
  const next = previous.then(fn, fn).finally(() => {
    if (accountOrganizeQueue.get(accountId) === next) accountOrganizeQueue.delete(accountId);
  });
  accountOrganizeQueue.set(accountId, next);
  return next;
}

// This is a long-running, many-thousand-call operation on a real inbox — long
// enough to outlast a single access token's lifetime. getValidAccessToken is a
// cheap local DB read (and only refreshes over the network once actually
// close to expiry), so calling it fresh before every provider request is the
// simplest way to never hand a stale token to a call deep into the run.
async function scanGmailInboxByBrand(accountId: string): Promise<{ brand: string; ids: string[] }[]> {
  const ids = await listMessageIdsByLabel(await getValidAccessToken(accountId), "INBOX");
  const byBrand = new Map<string, string[]>();

  for (const id of ids) {
    const raw = await withBackoff(async () => getMessageMetadata(await getValidAccessToken(accountId), id));
    const brand = brandForDomain(gmailFromDomain(raw.payload?.headers));
    if (!brand) continue;
    (byBrand.get(brand) ?? byBrand.set(brand, []).get(brand)!).push(id);
  }

  return [...byBrand.entries()].map(([brand, msgIds]) => ({ brand, ids: msgIds }));
}

async function scanGraphInboxByBrand(accountId: string): Promise<{ brand: string; ids: string[] }[]> {
  const messages = await withBackoff(async () => listAllMessagesWithSender(await getValidAccessToken(accountId), "inbox"));
  const byBrand = new Map<string, string[]>();

  for (const message of messages) {
    const address = message.from?.emailAddress?.address;
    if (!address) continue;
    const brand = brandForDomain(domainOf(address.toLowerCase()));
    if (!brand) continue;
    (byBrand.get(brand) ?? byBrand.set(brand, []).get(brand)!).push(message.id);
  }

  return [...byBrand.entries()].map(([brand, msgIds]) => ({ brand, ids: msgIds }));
}

/**
 * Scans this account's ENTIRE live inbox (not just what MailGuard has synced
 * locally — sync only keeps a rolling window, this reads the real mailbox
 * directly) and files recurring senders into a real Gmail label / Outlook
 * folder named after the brand, nested under a single "MailGuard" > "Marques"
 * parent so dozens of brand folders collapse behind one entry in the mail
 * client's sidebar instead of flooding the top-level folder list. Reuses a
 * matching folder the user already has — still-top-level ones included, so an
 * existing "Blizzard" folder keeps getting Blizzard mail filed into it rather
 * than a new nested one being created alongside it.
 */
export function organizeAccountBySender(accountId: string): Promise<OrganizeBySenderSummary> {
  return withAccountOrganizeLock(accountId, () => runOrganizeAccountBySender(accountId));
}

async function runOrganizeAccountBySender(accountId: string): Promise<OrganizeBySenderSummary> {
  const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });

  const groups =
    account.provider === "GOOGLE" ? await scanGmailInboxByBrand(accountId) : await scanGraphInboxByBrand(accountId);
  const qualifying = groups.filter((g) => g.ids.length >= MIN_GROUP_SIZE);
  const scanned = groups.reduce((sum, g) => sum + g.ids.length, 0);

  let existingByLowerName: Map<string, string>;
  if (account.provider === "GOOGLE") {
    existingByLowerName = await buildGmailBrandMap(await getValidAccessToken(accountId));
  } else {
    const token = await getValidAccessToken(accountId);
    const brandsParentId = await findGraphBrandsParent(token);
    existingByLowerName = await buildGraphBrandMap(token, brandsParentId);
  }

  let moved = 0;
  let failed = 0;
  let foldersCreated = 0;
  let foldersReused = 0;
  let graphBrandsParentId: string | null = null;

  for (const group of qualifying) {
    let destinationId = existingByLowerName.get(group.brand.toLowerCase());
    if (destinationId) {
      foldersReused++;
    } else {
      try {
        const accessToken = await getValidAccessToken(accountId);
        if (account.provider === "GOOGLE") {
          destinationId = await ensureLabel(accessToken, `${GMAIL_BRANDS_PREFIX}${group.brand}`);
        } else {
          if (!graphBrandsParentId) graphBrandsParentId = await ensureGraphBrandsParent(accessToken);
          destinationId = await ensureChildFolder(accessToken, graphBrandsParentId, group.brand);
        }
        foldersCreated++;
      } catch (err) {
        console.error(`[organize-by-sender] échec de création du dossier/libellé pour "${group.brand}"`, err);
        failed += group.ids.length;
        continue;
      }
    }

    for (const providerMessageId of group.ids) {
      try {
        if (account.provider === "GOOGLE") {
          await withBackoff(async () => modifyLabels(await getValidAccessToken(accountId), providerMessageId, [destinationId!], ["INBOX"]));
        } else {
          await withBackoff(async () => moveMessage(await getValidAccessToken(accountId), providerMessageId, destinationId!));
        }
        await db.message
          .updateMany({
            where: { accountId, providerMessageId, state: "INBOX" },
            data: { state: "ORGANIZED", providerFolder: destinationId },
          })
          .catch((err) => console.error(`[organize-by-sender] mise à jour locale échouée pour ${providerMessageId}`, err));
        moved++;
      } catch (err) {
        console.error(`[organize-by-sender] échec pour le message ${providerMessageId}`, err);
        failed++;
      }
    }
  }

  await db.auditLog.create({
    data: {
      actor: "USER",
      action: "organize_by_sender",
      accountId,
      messageIds: JSON.stringify([]),
      after: JSON.stringify({ scanned, groups: qualifying.length, moved, failed, foldersCreated, foldersReused }),
    },
  });

  return { scanned, groups: qualifying.length, moved, failed, foldersCreated, foldersReused };
}

/**
 * Runs organizeAccountBySender across every connected account, one at a time
 * (each call already scans a whole live mailbox — running accounts
 * concurrently would just multiply provider rate-limit and SQLite
 * write-lock pressure for no real speedup). Used by the "create/update brand
 * folders" button so a newly connected account gets the same MailGuard >
 * Marques structure as the others without visiting each account row.
 */
export async function organizeAllAccountsBySender(): Promise<OrganizeBySenderSummary> {
  const accounts = await db.account.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  const totals: OrganizeBySenderSummary = { scanned: 0, groups: 0, moved: 0, failed: 0, foldersCreated: 0, foldersReused: 0 };
  for (const account of accounts) {
    const summary = await organizeAccountBySender(account.id);
    totals.scanned += summary.scanned;
    totals.groups += summary.groups;
    totals.moved += summary.moved;
    totals.failed += summary.failed;
    totals.foldersCreated += summary.foldersCreated;
    totals.foldersReused += summary.foldersReused;
  }
  return totals;
}
