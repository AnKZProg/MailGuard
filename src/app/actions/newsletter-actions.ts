"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { unsubscribeFromMessages, type BulkUnsubscribeSummary } from "@/lib/unsubscribe/unsubscribe";
import { trashMessagesById, type BulkTrashSummary } from "@/lib/mail/trash";

/** Unsubscribes from every newsletter currently visible in the inbox (not yet
 * trashed/quarantined), across all accounts. */
export async function unsubscribeAllNewsletters(): Promise<BulkUnsubscribeSummary> {
  const messages = await db.message.findMany({
    where: { verdict: "NEWSLETTER", state: "INBOX", listUnsubscribe: { not: null } },
    select: { id: true },
  });
  return unsubscribeFromMessages(messages.map((m) => m.id));
}

/** Trashes every newsletter currently visible in the inbox, across all accounts.
 * Moves to the provider's trash, same as any other manual trash action — never
 * a permanent delete. */
export async function trashAllNewsletters(): Promise<BulkTrashSummary> {
  const messages = await db.message.findMany({
    where: { verdict: "NEWSLETTER", state: "INBOX" },
    select: { id: true },
  });
  const summary = await trashMessagesById(messages.map((m) => m.id));
  revalidatePath("/");
  return summary;
}
