"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { trashMessagesById, type BulkTrashSummary } from "@/lib/mail/trash";

/** Trashes every message currently classified SPAM or PHISHING and still sitting
 * in the inbox (not yet quarantined/trashed), across all accounts — the
 * "sitting there unaddressed" case, distinct from the quarantine queue. */
export async function trashAllJunkNow(): Promise<BulkTrashSummary> {
  const messages = await db.message.findMany({
    where: { verdict: { in: ["SPAM", "PHISHING"] }, state: "INBOX" },
    select: { id: true },
  });
  const summary = await trashMessagesById(messages.map((m) => m.id));
  revalidatePath("/");
  return summary;
}
